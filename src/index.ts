import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createNodeWebSocket } from '@hono/node-ws'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'node:fs'
const app = new Hono()
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

let clients: any[] = []
let cam: any = undefined
app.use('/static/*', serveStatic({ root: './' }))
app.get('/', upgradeWebSocket((c) => {
  return {
    onOpen(e, ws) {
      clients.push(ws)
      if (cam == undefined) {
        ws.send('no signal')
      }
    },
    onClose(evt, ws) {
      clients = clients.filter(client => client != ws)
      if (ws == cam) {
        cam = undefined
        for (const client of clients) {
          client.close()
        }
      }
    },
    onMessage(evt, ws) {
      let message = evt.data.toString()
      if (message.startsWith('img') && cam == undefined) {
        cam = ws
      }
      if (message.startsWith('img')) {
        for (const client of clients) {
          if (client == ws) continue
          client.send(message.slice(3))
        }
      }
    },
  }
}))

const db = require('./db');

app.get('/', (c) => {
  return c.html(readFileSync("./index.html").toString())
})
app.get('/graph', (c) => {
  return c.html(readFileSync("./graph.html").toString())
})

app.get('/now', (c) => {
  return new Promise((resolve, reject) => {
    // Query the most recent sensor data from the database
    db.get(`SELECT * FROM sensorData ORDER BY id DESC LIMIT 1`, (err: any, row: any) => {
      if (err) {
        console.error(err.message);
        return reject(c.text('Failed to retrieve data', 500));
      }
      // If row exists, return it; otherwise, return a default response
      if (row) {
        resolve(c.json(row));
      } else {
        //ไม่มีดาต้า
        resolve(c.json({ error: "no data" }));
      }
    });
  });
});

app.post('/update', async (c) => {
  const { Hm, DHm, Lm, temp } = await c.req.json();
  db.run(`INSERT INTO sensorData (Hm, DHm, Lm, temp, dateTime) VALUES (?, ?, ?, ?, ?)`,
    [Hm, DHm, Lm, temp, new Date().toString()],
    console.log(`Inserted a row ${JSON.stringify({ Hm, DHm, Lm, temp, time: new Date().toString() })}`)
  );
  return c.json({ message: "Updated" });
});

app.get('/history', async (c) => {
  const rows: any = await new Promise((resolve, reject) => {
    db.all(`SELECT * FROM sensorData ORDER BY id DESC LIMIT 100`, (error: any, rows: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows);
      }
    });
  });
  return c.json(rows);
});

const port = 3000
console.log(`Server is running on port ${port}`)

const server = serve({
  fetch: app.fetch,
  port
})
injectWebSocket(server)