"""
Streaming video view with HTTP Range request support.
This is required for proper video seeking and duration detection in browsers.
Django's built-in static file serving does NOT support Range requests.
"""

import os
import re
import mimetypes
from django.http import StreamingHttpResponse, HttpResponse
from django.conf import settings


def stream_video(request, path):
    """Serve a video file with proper Range request support for seeking."""
    full_path = os.path.join(settings.MEDIA_ROOT, path)

    if not os.path.isfile(full_path):
        return HttpResponse("File not found", status=404)

    # Determine content type
    content_type, _ = mimetypes.guess_type(full_path)
    if not content_type:
        content_type = 'video/mp4'

    file_size = os.path.getsize(full_path)
    range_header = request.META.get('HTTP_RANGE', '')

    if range_header:
        # Parse Range header: "bytes=start-end"
        match = re.match(r'bytes=(\d+)-(\d*)', range_header)
        if match:
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else file_size - 1
            end = min(end, file_size - 1)
            length = end - start + 1

            def file_iterator():
                with open(full_path, 'rb') as f:
                    f.seek(start)
                    remaining = length
                    chunk_size = 8192
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = f.read(read_size)
                        if not data:
                            break
                        remaining -= len(data)
                        yield data

            response = StreamingHttpResponse(file_iterator(), status=206, content_type=content_type)
            response['Content-Length'] = str(length)
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Accept-Ranges'] = 'bytes'
            response['Access-Control-Allow-Origin'] = '*'
            return response

    # No Range header — serve full file
    def full_file_iterator():
        with open(full_path, 'rb') as f:
            chunk_size = 8192
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                yield data

    response = StreamingHttpResponse(full_file_iterator(), content_type=content_type)
    response['Content-Length'] = str(file_size)
    response['Accept-Ranges'] = 'bytes'
    response['Access-Control-Allow-Origin'] = '*'
    return response
