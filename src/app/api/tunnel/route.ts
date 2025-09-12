import { NextRequest } from 'next/server'
import { createServer } from 'http'
import { exec } from 'child_process'
import os from 'os'

// This is a development-only API route to help expose your local server to the internet
// for mobile testing. It should be removed in production.

let tunnelUrl: string | null = null
let tunnelProcess: any = null

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'This endpoint is only available in development mode' }, { status: 403 })
  }

  if (tunnelUrl) {
    return Response.json({ url: tunnelUrl })
  }

  try {
    // Get local IP address
    const networkInterfaces = os.networkInterfaces()
    let localIp = '127.0.0.1'
    
    Object.keys(networkInterfaces).forEach((ifname) => {
      networkInterfaces[ifname]?.forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address
        }
      })
    })

    // Start a tunnel using ngrok or localtunnel
    const startTunnel = () => {
      return new Promise<string>((resolve, reject) => {
        try {
          // Try with npx localtunnel
          exec(`npx localtunnel --port 3000`, (error, stdout, stderr) => {
            if (error) {
              console.error('Error starting tunnel:', error)
              reject(error)
              return
            }
            
            const match = stdout.match(/your url is: (https:\/\/[^\s]+)/)
            if (match && match[1]) {
              tunnelUrl = match[1]
              resolve(tunnelUrl)
            } else {
              reject(new Error('Could not parse tunnel URL'))
            }
          })
        } catch (err) {
          reject(err)
        }
      })
    }

    tunnelUrl = await startTunnel()
    return Response.json({ url: tunnelUrl })
  } catch (error) {
    console.error('Error creating tunnel:', error)
    return Response.json(
      { error: 'Failed to create tunnel. Try installing localtunnel: npm install -g localtunnel' },
      { status: 500 }
    )
  }
}
