import { describe, it, expect } from 'vitest'
import { parseCsvLine } from './process-manager'

describe('parseCsvLine', () => {
  it('splits simple comma-separated values', () => {
    const result = parseCsvLine('a,b,c,d,e')
    expect(result).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('handles quoted values with commas inside', () => {
    const result = parseCsvLine('"name.exe","1234","Console","1","5,120 K"')
    expect(result).toEqual(['name.exe', '1234', 'Console', '1', '5,120 K'])
  })

  it('handles empty values', () => {
    const result = parseCsvLine('a,,c')
    expect(result).toEqual(['a', '', 'c'])
  })

  it('handles empty quoted values', () => {
    const result = parseCsvLine('"",""')
    expect(result).toEqual(['', ''])
  })

  it('handles mixed quoted and unquoted values', () => {
    const result = parseCsvLine('"svchost.exe","1234","","0","12,345 K"')
    expect(result).toEqual(['svchost.exe', '1234', '', '0', '12,345 K'])
  })
})

describe('parseNetstat', () => {
  it('parses TCP connections with PIDs', () => {
    const output = `
Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1234
  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4
  TCP    192.168.1.5:54321      1.2.3.4:443            ESTABLISHED     5678
`
    const portMap = new Map<number, number[]>()
    for (const line of output.split('\n')) {
      const p = line.trim().split(/\s+/)
      if (p.length >= 5 && p[0] === 'TCP') {
        const portMatch = p[1].match(/:(\d+)$/)
        const pid = parseInt(p[4], 10)
        if (portMatch && !isNaN(pid) && pid > 0) {
          if (!portMap.has(pid)) portMap.set(pid, [])
          portMap.get(pid)!.push(parseInt(portMatch[1], 10))
        }
      }
    }
    expect(portMap.get(1234)).toEqual([135])
    expect(portMap.get(4)).toEqual([445])
    expect(portMap.get(5678)).toEqual([54321])
  })

  it('ignores non-TCP lines', () => {
    const output = '  UDP    0.0.0.0:1900           *:*                                    1234'
    const portMap = new Map<number, number[]>()
    for (const line of output.split('\n')) {
      const p = line.trim().split(/\s+/)
      if (p.length >= 5 && p[0] === 'TCP') {
        const portMatch = p[1].match(/:(\d+)$/)
        const pid = parseInt(p[4], 10)
        if (portMatch && !isNaN(pid) && pid > 0) {
          if (!portMap.has(pid)) portMap.set(pid, [])
          portMap.get(pid)!.push(parseInt(portMatch[1], 10))
        }
      }
    }
    expect(portMap.size).toBe(0)
  })
})