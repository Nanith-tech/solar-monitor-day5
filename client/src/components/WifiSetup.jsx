import React, { useState } from 'react';
export default function WifiSetup({deviceId}) {
  const [espIp,setIp]=useState('192.168.4.1'), [ssid,setSsid]=useState(''), [password,setPassword]=useState(''), [busy,setBusy]=useState(false), [message,setMessage]=useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true);setMessage('Sending settings to ESP32…');
    try {
      const response=await fetch(`/api/v1/devices/${encodeURIComponent(deviceId)}/wifi`,{method:'POST',headers:{'Content-Type':'application/json','X-Solar-Setup':'1'},body:JSON.stringify({espIp,ssid,password}),signal:AbortSignal.timeout(16000)});
      const body=await response.json();if(!response.ok)throw new Error(body.error?.message || 'Wi-Fi setup failed.');
      setPassword('');setMessage(`${body.message} Connect this laptop to the same new Wi-Fi and check the Serial Monitor / sensor status.`);
    } catch(error){setMessage(error.name==='TimeoutError' ? 'Request timed out. Settings may have reached ESP32; check Serial Monitor before retrying.' : error.message);}
    finally{setBusy(false);}
  }
  return <section className="panel wifi-panel" id="wifi-setup"><h2>Connect ESP32 to Wi-Fi</h2><p>Use this dashboard on the backend laptop. Enter the ESP32’s current IP from Serial Monitor, or join its Solar-Setup hotspot and use 192.168.4.1.</p><form onSubmit={submit} className="wifi-form"><label>ESP32 IPv4 address<input required value={espIp} onChange={e=>setIp(e.target.value)} placeholder="192.168.4.1" disabled={busy}/></label><label>Wi-Fi name (SSID)<input required value={ssid} onChange={e=>setSsid(e.target.value)} autoComplete="off" disabled={busy}/></label><label>Wi-Fi password<input aria-label="Wi-Fi password" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={password ? 8 : undefined} maxLength={63} disabled={busy}/><small>Leave empty only for an open network.</small></label><button className="refresh-button" disabled={busy}>{busy ? 'Saving…' : 'Save Wi-Fi on ESP32'}</button></form><p role="status">{message}</p><details><summary>ESP32 is offline or the old Wi-Fi no longer exists</summary><p>Wait 30 seconds for Solar-Setup to appear. Its password is the first 12 characters of your private DEVICE_KEY. Join it on this laptop. If Atlas is unreachable, stop the normal app and run npm run wifi:setup, then open localhost:5173. After saving, join the new Wi-Fi and restart with npm run dev:all. See docs/WIFI_SETUP.md.</p></details></section>;
}
