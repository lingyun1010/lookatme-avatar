#!/usr/bin/env python3
"""Prepare, build and locally serve a LookAtMe avatar project."""
import argparse
import functools
import http.server
import os
from pathlib import Path
import shutil
import subprocess
import sys


def run(*args, cwd=None):
    subprocess.run([str(a) for a in args], cwd=cwd, check=True)


def python_for(project):
    return project / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['prepare', 'build', 'serve'])
    parser.add_argument('--project', type=Path, required=True)
    parser.add_argument('--video', type=Path)
    parser.add_argument('--output', type=Path, help='Absolute output directory or path relative to project')
    parser.add_argument('--port', type=int, default=0, help='0 selects an available local port')
    args = parser.parse_args()
    project = args.project.resolve()
    output = args.output or Path('output')
    if not output.is_absolute():
        output = project / output
    if args.command == 'prepare':
        if not args.video or not args.video.is_file():
            parser.error('--video must name an existing uploaded video')
        if sys.version_info < (3, 10):
            parser.error('Python 3.10 or newer is required')
        missing = [name for name in ('git', 'node', 'npm', 'ffmpeg', 'ffprobe') if not shutil.which(name)]
        if missing:
            parser.error('Install these prerequisites first: ' + ', '.join(missing))
        if project.exists() and any(project.iterdir()):
            parser.error('Use a new or empty project directory; existing files will not be overwritten')
        video = args.video.resolve()
        run('git', 'clone', '--depth', '1', 'https://github.com/lingyun1010/lookatme.git', project)
        run(sys.executable, '-m', 'venv', project / '.venv')
        py = python_for(project)
        run(py, '-m', 'pip', 'install', '-r', project / 'tools/requirements.txt')
        run('npm', 'ci', cwd=project)
        run('npm', 'run', 'build:lib', cwd=project)
        run(py, project / 'tools/extract_frames.py', video, '--output', project / 'work')
        run(py, project / 'tools/make_contact_sheet.py', project / 'work/frames', '--output', project / 'work/contact-sheet.jpg')
        print(f'Inspect {project / "work/contact-sheet.jpg"} and all continuation pages, then write {project / "selection.json"}.', flush=True)
    elif args.command == 'build':
        py = python_for(project)
        if not py.is_file() or not (project / 'selection.json').is_file():
            parser.error('Prepare the project and write selection.json after visually inspecting its frames')
        run(py, project / 'tools/build_angle_map.py', '--frames', project / 'work/frames', '--selection', project / 'selection.json', '--output', output)
        print(f'Generated {output}', flush=True)
    else:
        if not (output / 'preview.html').is_file():
            parser.error('Build the avatar before serving its preview')
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(output))
        with http.server.ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
            print(f'LookAtMe preview: http://127.0.0.1:{server.server_port}/preview.html', flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass


if __name__ == '__main__':
    try:
        main()
    except (OSError, subprocess.CalledProcessError) as error:
        print(f'LookAtMe setup failed: {error}. Fix the reported prerequisite or command failure before retrying.', file=sys.stderr)
        sys.exit(1)
