"""Rebuild the exact 10 photos > 6s video > 15 photos > 8s orbit montage."""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent / '.work' / 'story-encode'
WORK.mkdir(parents=True, exist_ok=True)
ASSETS = ROOT / 'dist' / 'assets'
SOURCES = ROOT.parent / 'source-media'
FILTER = 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=30'

def encode(name, inputs, duration):
    dest = WORK / (name + '.mp4')
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*inputs,
        '-vf',FILTER,'-t',str(duration),'-an','-c:v','libx264','-preset','medium',
        '-crf','19','-pix_fmt','yuv420p','-r','30','-g','30',
        '-video_track_timescale','15360',str(dest)],check=True)
    print(f'{name}: {dest.stat().st_size} bytes',flush=True)
    return dest

segments = [
    encode('01-build-stills',['-framerate','5','-start_number','1','-i',str(ASSETS/'houses'/'build-%02d.webp')],2),
    encode('02-construction',['-i',str(SOURCES/'construction-master.mp4')],6),
    encode('03-house-stills',['-framerate','5','-start_number','1','-i',str(ASSETS/'houses'/'house-%02d.webp')],3),
    encode('04-orbit',['-i',str(SOURCES/'orbit-master.mp4')],8),
]
listing=WORK/'segments.txt'
listing.write_text(''.join("file '"+p.as_posix()+"'\n" for p in segments),encoding='utf-8')
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0',
    '-i',str(listing),'-c','copy','-movflags','+faststart',str(ASSETS/'dream-story.mp4')],check=True)
timeline={'fps':30,'frameCount':570,'durationSeconds':19,'width':1280,'height':720,
    'chapters':[{'start':0,'end':2,'type':'photos','count':10},
                {'start':2,'end':8,'type':'video','source':'construction-master.mp4'},
                {'start':8,'end':11,'type':'photos','count':15},
                {'start':11,'end':19,'type':'video','source':'orbit-master.mp4'}]}
(ASSETS/'story-timeline.json').write_text(json.dumps(timeline,indent=2),encoding='utf-8')
print('Montage ready: '+str(ASSETS/'dream-story.mp4'),flush=True)
