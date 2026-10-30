#!/usr/bin/env bash
# Silent cut timed to VOICEOVER.md blocks. Re-run with new durations once the MP3 timings are known.
set -e
R="raw/page@8c41345f1f8d3e72df9993a2841f45a5.webm"; F="-r 30 -pix_fmt yuv420p -c:v libx264 -preset veryfast -crf 20 -an"
card(){ ffmpeg -y -v error -framerate 30 -loop 1 -t $2 -i $1 -vf "scale=1280:720,zoompan=z='min(zoom+0.0004,1.04)':d=1:s=1280x720:fps=30" $F $3; }
clip(){ ffmpeg -y -v error -ss $1 -to $2 -i "$R" -vf "scale=1280:720,fps=30" $F $3; }
hold(){ ffmpeg -y -v error -ss $1 -i "$R" -frames:v 1 hold.png && card hold.png $2 $3; }
card card1.png 18.0 s01.mp4          # 0:00 headlines
card card2.png 10.0 s02.mp4          # 0:18 title
clip 3.4 11.5 s03.mp4              # 0:28 pick biryani, start (8s)
clip 12 30.9 s04.mp4                 # 0:36 inventory fills (19s)
clip 43 63.1 s05.mp4                 # 0:55 loop: candidate passes (16s)
hold 61.5 13.0 s06.mp4               # 1:11 approved photo + report (to 1:28)
card card3.png 27.0 s07.mp4          # 1:28 dosa rejected twice
clip 62 67.4 s08.mp4                 # 1:55 click Instagram story (5s)
clip 96 105.6 s09.mp4              # 2:00 variant passed (9.5s, to ~2:10)
card card4.png 14.9 s10.mp4          # 2:10 chicken salad
card card5.png 12.6 s11.mp4          # 2:25 models + links
ls s*.mp4 | sed "s/^/file '/;s/\$/'/" > list.txt
ffmpeg -y -v error -f concat -safe 0 -i list.txt -c copy plateproof-silent.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 plateproof-silent.mp4
