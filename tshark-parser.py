#!/usr/bin/python
import subprocess, sys
import atexit
## command to run - tcp only ##
cmd = "tshark -I -i en1 -Y ip"

## run it ##
p = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE)

def parseTshark(data):
    chunks = data.split()
    packet = {}
    packet["ts"] = chunks[1]
    packet["src"] = chunks[2]
    packet["dst"] = chunks[4]
    packet["proto"] = chunks[5]
    packet["len"] = chunks[6]
    return packet

def cleanup():
    p.kill()

def main():
    atexit.register(cleanup)

    ## But do not wait till cmd finish, start displaying output immediately ##
    while True:
        out = p.stdout.readline()
        if out == '' and p.poll() != None:
            break
        if out != '':
            packetData = parseTshark(out)
            print(packetData)
            # sys.stdout.write(out)
            # sys.stdout.flush()

if __name__ == '__main__':
    main()
