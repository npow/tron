#!/usr/bin/env python3
"""Generate four Marble worlds once; resume polling/downloads without duplicate charges.
Reads WORLD_LABS_API_KEY from the environment or this project's .env.local.
Credentials are never written into app assets or generation records.
"""
import json, os, time, subprocess
from pathlib import Path
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/worlds'
OUT.mkdir(parents=True,exist_ok=True)
key=os.environ.get('WORLD_LABS_API_KEY')
if not key:
 for p in [ROOT/'.env.local']:
  if p.exists():
   for line in p.read_text().splitlines():
    if line.startswith('WORLD_LABS_API_KEY='):key=line.split('=',1)[1].strip().strip('\"\'')
  if key:break
if not key: raise SystemExit('WORLD_LABS_API_KEY is missing')
headers={'WLT-Api-Key':key}
BASE='https://api.worldlabs.ai/marble/v1'
scenes=[
 ('city','Meridian city','A vast realistic futuristic megacity at blue hour, contemporary AAA game cinematic quality, physically plausible architecture, high resolution photographic detail. Street-level view in an open empty intersection surrounded by immense richly detailed towers, elevated monorails, restrained white architectural lighting, warm interior windows, brushed titanium facades, glass curtain walls, dense infrastructure, wet asphalt reflections and a spectacular distant skyline. Restrained accents of cyan lighting, absolutely no retro neon aesthetic or wireframe art. Cinematic photorealistic environment, dramatic architecture, deep perspective along multiple broad straight streets. No people, no vehicles, no circular track. Ground is flat and unobstructed at the centre. Wide navigable outdoor world.'),
 ('desert','Solar wasteland','A magnificent open red sandstone desert canyon at golden sunset. Monument Valley scale sheer stratified orange cliffs and eroded arches tower on both sides of a broad winding dry sandy riverbed. Wind-carved stone, dust in warm sunlight, distant mesas, large blue and peach sky. Photorealistic cinematic science fiction frontier, subtle abandoned industrial blast doors between cliffs far away. No vehicles, no people, no racetrack, no pavement. Open empty flat sandy ground in the foreground, huge outdoor world.'),
 ('ice','Cryo pass','A spectacular arctic glacial crevasse at polar twilight. Jagged turquoise ice walls and enormous snowy mountain peaks surround a deep blue abyss, hanging fractured ice shelves, blowing snow, pale green aurora across an indigo sky. Cinematic photorealism, luminous subsurface ice, huge sense of vertical scale and danger. View from a broad flat ice shelf looking across the chasm. No people, no vehicles, no roads, no circular track. Expansive outdoor environment.'),
 ('reactor','The core','Interior of an immense alien fusion reactor cathedral, a rectangular arena inside a gigantic industrial chamber. Towering black titanium walls, intricate machinery, violet energy conduits, red warning lights, overhead suspended concentric magnetic rings around a brilliant plasma core high above the floor, volumetric shafts of light. The centre floor is a huge empty flat dark metallic square. Cinematic photorealistic science fiction, dark architectural detail and immense depth. No people, no vehicles, no circular road. Wide open central floor.'),
]
records=[]
for slug,name,prompt in scenes:
 folder=OUT/slug;folder.mkdir(exist_ok=True)
 opfile=folder/'operation.json'
 if opfile.exists():op=json.loads(opfile.read_text())
 else:
  response=requests.post(BASE+'/worlds:generate',headers=headers,json={'display_name':'TRON / '+name,'model':'marble-1.1','world_prompt':{'type':'text','text_prompt':prompt}},timeout=90)
  if not response.ok:raise SystemExit(f'{slug}: generation HTTP {response.status_code}: {response.text[:160]}')
  op=response.json();opfile.write_text(json.dumps(op,indent=2))
  print('Started',slug,op.get('operation_id'),flush=True)
 records.append((slug,name,folder,op))
while records:
 pending=[]
 for slug,name,folder,op in records:
  if not op.get('done'):
   response=requests.get(BASE+'/operations/'+op['operation_id'],headers=headers,timeout=60)
   response.raise_for_status();op=response.json();(folder/'operation.json').write_text(json.dumps(op,indent=2))
  if not op.get('done'):
   pending.append((slug,name,folder,op));continue
  if op.get('error'):raise SystemExit(f'{slug}: {op["error"]}')
  world=op['response'];world=world.get('world',world)
  wid=world.get('id') or world.get('world_id')
  if wid:
   response=requests.get(BASE+'/worlds/'+wid,headers=headers,timeout=60);response.raise_for_status()
   world=response.json();world=world.get('world',world)
  (folder/'world.json').write_text(json.dumps(world,indent=2))
  assets=world['assets']
  downloads=[('panorama.png',assets['imagery']['pano_url']),('scene.spz',assets['splats']['spz_urls']['500k']),('scene-full.spz',assets['splats']['spz_urls']['full_res']),('collider.glb',assets['mesh']['collider_mesh_url'])]
  for filename,url in downloads:
   dest=folder/filename
   if not dest.exists():
    r=requests.get(url,timeout=300);r.raise_for_status();dest.write_bytes(r.content)
  subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(folder/'panorama.png'),'-q:v','1',str(folder/'panorama.jpg')],check=True)
  print('Ready',slug,wid,flush=True)
 records=pending
 if records:
  print('Generating:',', '.join(r[0] for r in records),flush=True);time.sleep(30)
manifest=[]
for slug,name,_ in scenes:
 w=json.loads((OUT/slug/'world.json').read_text())
 manifest.append({'id':slug,'name':name,'provider':'World Labs Marble','model':w.get('model','marble-1.1'),'worldId':w.get('id',w.get('world_id')),'url':w.get('world_marble_url'),'panorama':f'./worlds/{slug}/panorama.jpg','splat':f'./worlds/{slug}/scene.spz','fullResolutionSplat':f'./worlds/{slug}/scene-full.spz','collider':f'./worlds/{slug}/collider.glb'})
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('All four Marble worlds downloaded.',flush=True)
