#!/bin/sh
# Build the six-file source ladder apple.com ships for one inline clip, plus the
# still that sits underneath it. See skills/apple-design/references/media.md.
#
#   tools/make-clip.sh <source> <out-dir>
#
# <source> is a video master, or a photograph — a still gets a slow 1.11x push
# over three seconds (zoompan) rather than being left static. Three crops, two
# densities each: portrait on phones, 1.62 on tablets, 2.06 on desktop. The
# crop is re-framed per breakpoint on purpose; a letterboxed 16:9 render into a
# phone slot is the thing this avoids.
set -eu
src=${1:?source file}; out=${2:?output directory}
mkdir -p "$out"

# name  w     h     crf   (aspect follows from w/h)
set -- "small 420 480 26" "small_2x 840 960 24" \
       "medium 934 576 25" "medium_2x 1868 1152 23" \
       "large 1260 612 25" "large_2x 2520 1224 25"

for spec in "$@"; do
  set -- $spec; name=$1 w=$2 h=$3 crf=$4
  ar=$(echo "$w $h" | awk '{printf "%.4f", $1/$2}')

  case $(file -b --mime-type "$src") in
    image/*)  # a photograph: 1.11x push over three seconds, 3x oversampled
      vf="scale=$((w*3)):-1,zoompan=z='1+0.0012*on':d=90:s=${w}x${h}:fps=30,format=yuv420p"
      in="-loop 1 -i $src -t 3" ;;
    *)        # a master: crop to the aspect this breakpoint wants, then fit
      vf="fps=30,crop=ih*$ar:ih,scale=$w:$h:flags=lanczos,format=yuv420p"
      in="-i $src" ;;
  esac

  # shellcheck disable=SC2086
  ffmpeg -nostdin -loglevel error -y $in -an -vf "$vf" \
    -c:v libx264 -profile:v high -pix_fmt yuv420p -crf "$crf" -g 300 \
    -movflags +faststart "$out/$name.mp4"

  # the start frame, one per crop — this is what ships if the video never arrives.
  # cwebp rather than ffmpeg's libwebp, which many ffmpeg builds ship without.
  case $name in *_2x) ;; *)
    ffmpeg -nostdin -loglevel error -y -i "$out/$name.mp4" -frames:v 1 \
      -f image2 -c:v png "$out/start-$name.png"
    cwebp -quiet -q 82 "$out/start-$name.png" -o "$out/start-$name.webp"
    rm -f "$out/start-$name.png" ;;
  esac

  printf '%-10s %5sx%-5s %8s\n' "$name" "$w" "$h" "$(du -h "$out/$name.mp4" | cut -f1)"
done

echo "budget for three seconds: under 400K at 1x, under 1M at 2x."
echo "over that, the footage has grain or noise that h264 is spending its bitrate on."
