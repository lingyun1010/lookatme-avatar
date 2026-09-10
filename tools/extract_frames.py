"""Extract every decoded visual frame (not just encoded keyframes)."""
import argparse
import json
import pathlib
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video', type=pathlib.Path)
    parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('work'))
    args = parser.parse_args()
    if not args.video.is_file():
        parser.error('Video does not exist')
    frames = args.output / 'frames'
    if frames.exists() and any(frames.iterdir()):
        parser.error('Use an empty output directory to avoid stale frame numbers')
    try:
        metadata = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(args.video.resolve())]))
        frames.mkdir(parents=True, exist_ok=True)
        (args.output / 'video-info.json').write_text(json.dumps(metadata, indent=2))
        subprocess.run(['ffmpeg', '-v', 'error', '-i', str(args.video.resolve()), '-map', '0:v:0', '-fps_mode', 'passthrough', '-start_number', '1', str(frames / '%06d.png')], check=True)
    except FileNotFoundError:
        parser.error('Install FFmpeg and ffprobe first')
    except subprocess.CalledProcessError as error:
        parser.error(f'Video inspection/extraction failed: {error}')
    print(f'Extracted {len(list(frames.glob("*.png")))} frames to {frames}. Numbers are 1-based decoded frame order.')


if __name__ == '__main__':
    main()
