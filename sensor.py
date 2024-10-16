import cv2
import websockets
import base64
import websockets.sync
import websockets.sync.client
from time import sleep,time,gmtime, strftime
import serial
import re
import httpx
import json
import threading

arduino = serial.Serial('/dev/ttyUSB0', 9600 , timeout=1)

def rawToLux(raw):
    vout = raw * (5 / 1023)
    RLDR = (10000 * (5 - vout))/vout; 
    phy = 500 / (RLDR / 1000)
    return phy


# decode readed data
def decode(data):
    data = [float(i) for i in re.findall('[.0-9]+',data)]
    if len(data) == 4:
        return (False, 
            {
                "Hm":data[0],
                "temp":data[1],
                "Lm":rawToLux(data[2]),
                "DHm":(data[3] / 1023) * 100
            }
        )
    return (True,{})

# read from serial
def read():
    buf = arduino.read(400).decode('utf-8') + ''
    while True:
        pending = arduino.in_waiting
        if pending:
            buf += arduino.read(pending).decode('utf-8')
        else:
            break
    data = ''.join(buf)
    return data

# init camera
cap = cv2.VideoCapture(0)

server = "10.24.4.42:3000"
headers = {'Content-type': 'application/json'}

def camera_thread():
    print("Started camera")
    while True:
        try:
            with websockets.sync.client.connect(f'ws://{server}') as websocket:
                print("connected")
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    _,buf = cv2.imencode('.jpg',frame)
                    data = "img" + base64.b64encode(buf).decode('utf-8')
                    websocket.send(data)
                    sleep(0.2)
        except Exception as e:
            print(e)
            pass
        sleep(1)
        print("reconnecting")

def http_client_thread():
    print("Started http client")
    t = time()
    while True:
        try:
            if time() - t >= 1 :
                readed = False
                for i in range(2):
                    data = read()
                    (err,data) = decode(data)
                    if not err:
                        httpx.post(f'http://{server}/update', json=data)
                        print(data)
                        readed = True
                        break
                if not readed:
                    print("Error Failed to decode")
                t = time()
            sleep(0.2)
        except Exception as e:
            print(e)
            pass

# main program
camtr = threading.Thread(target=camera_thread)
httptr = threading.Thread(target=http_client_thread)
httptr.start()
camtr.start()