#!/usr/bin/python
import subprocess, sys
import atexit
import asyncio
import websockets
import json

## command to run - tcp only ##
# cmd = "tshark -I -i en1 -Y ip"
cmd = "tshark -i en0 -Y ip"

## run it ##
p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

def parseTshark(data):
    chunks = data.split()
    packet = {}
    packet["ts"] = chunks[1].decode("utf-8")
    packet["src"] = chunks[2].decode("utf-8")
    packet["dst"] = chunks[4].decode("utf-8")
    packet["proto"] = chunks[5].decode("utf-8")
    packet["len"] = chunks[6].decode("utf-8")
    return packet

def cleanup():
    p.kill()

def start_sniffer():
    ## But do not wait till cmd finish, start displaying output immediately ##
    while True:
        out = p.stdout.readline()
        if out == '' and p.poll() != None:
            break
        if out != '':
            packetData = parseTshark(out)
            # print(repr(packetData))
            asyncio.get_event_loop().run_until_complete(send_WS_message(json.dumps(packetData)))
            # sys.stdout.write(out)
            # sys.stdout.flush()

async def send_WS_message(msg):
    async with websockets.connect('ws://localhost:8081') as websocket:
        await websocket.send(msg)
        print(f"> {msg}")

def main():
    atexit.register(cleanup)
    start_sniffer()

if __name__ == '__main__':
    main()
