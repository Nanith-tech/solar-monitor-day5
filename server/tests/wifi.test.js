import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import supertest from 'supertest';
import {wifiRoutes,privateIPv4} from '../src/routes/wifi.routes.js';
import {errorHandler} from '../src/middleware/errorHandler.js';
import {createApp} from '../src/app.js';
const config={deviceId:'solar-node-001',deviceKey:'a'.repeat(64),corsOrigin:'http://localhost:5173'};
const body={espIp:'192.168.4.1',ssid:'New & hotspot',password:'a&b+ cdef'};
function fixture(request){const app=express();app.use(express.json());app.use('/api/v1/devices',wifiRoutes(config,request));app.use(errorHandler);return supertest(app);}
const post=api=>api.post('/api/v1/devices/solar-node-001/wifi').set('Origin',config.corsOrigin).set('X-Solar-Setup','1');
test('private IP and Wi-Fi validation prevent arbitrary URLs, loopback and public relay',async()=>{
 for(const ip of ['127.0.0.1','169.254.169.254','8.8.8.8','http://192.168.4.1','192.168.4.255','::1'])assert.equal(privateIPv4(ip),false);
 for(const ip of ['192.168.4.1','10.1.2.3','172.16.1.2'])assert.equal(privateIPv4(ip),true);
 const api=fixture(()=>assert.fail('Must not contact device'));
 for(const value of [{...body,espIp:'8.8.8.8'},{...body,ssid:'x'.repeat(33)},{...body,ssid:'bad\nssid'},{...body,password:'short'}])assert.equal((await post(api).send(value)).status,400);
 assert.equal((await api.post('/api/v1/devices/solar-node-001/wifi').send(body)).status,403);
 assert.equal((await post(api).set('Origin','https://evil.example').send(body)).status,403);
 assert.equal((await post(api).unset('X-Solar-Setup').send(body)).status,403);
});
test('Wi-Fi relay verifies identity before sending secret and encodes credentials without logging',async()=>{
 const calls=[];const api=fixture(async(url,options)=>{calls.push({url,options});return calls.length===1 ? {ok:true,json:async()=>({deviceId:config.deviceId,wifiSetup:1})} : {status:202};});
 const answer=await post(api).unset('Origin').set('Referer',config.corsOrigin+'/').send(body);assert.equal(answer.status,202);assert.equal(answer.body.status,'accepted');
 assert.equal(calls[0].url,'http://192.168.4.1/solar-info');assert.equal(calls[0].options.headers,undefined);
 assert.equal(calls[1].url,'http://192.168.4.1/wifi');assert.equal(calls[1].options.headers['X-Device-Key'],config.deviceKey);
 assert.equal(new URLSearchParams(calls[1].options.body).get('password'),body.password);assert.equal(calls[1].options.redirect,'error');
 assert.ok(!JSON.stringify(answer.body).includes(body.password));assert.equal((await post(api).send(body)).status,429);
});
test('wrong board, auth mismatch and unreachable device return useful bounded errors',async()=>{
 let calls=0;let api=fixture(async()=>{calls++;return{ok:true,json:async()=>({deviceId:'other',wifiSetup:1})};});
 assert.equal((await post(api).send(body)).status,409);assert.equal(calls,1);
 calls=0;api=fixture(async()=>++calls===1 ? {ok:true,json:async()=>({deviceId:config.deviceId,wifiSetup:1})}:{status:401});assert.equal((await post(api).send(body)).status,401);
 api=fixture(async()=>{throw new Error('secret driver error');});const response=await post(api).send(body);assert.equal(response.status,502);assert.ok(!JSON.stringify(response.body).includes('secret'));
});
test('Wi-Fi recovery route runs even when MongoDB is disconnected',async()=>{
 const api=supertest(createApp(config));const response=await post(api).send({...body,espIp:'8.8.8.8'});assert.equal(response.status,400);assert.equal(response.body.error.code,'INVALID_WIFI');
 assert.equal((await api.get('/api/v1/devices')).status,503);
});
