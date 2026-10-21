# neural German voices (Microsoft Edge read-aloud) through the session proxy: python3 etts.py VOICE RATE PITCH OUT.mp3 "text"
import sys, os, ssl, asyncio
import edge_tts, edge_tts.communicate as C
C._SSL_CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')   # the proxy re-terminates TLS: trust its CA (verification stays on)
voice, rate, pitch, out, text = sys.argv[1:6]
async def main():
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, proxy=os.environ.get('HTTPS_PROXY'))
    await c.save(out)
asyncio.run(main())
