import { test } from 'node:test';
import assert from 'node:assert/strict';
import { angleDistance, pointerAngle } from '../src/core/angle.js';
import { selectFrame, validateAngleMap } from '../src/core/frameSelector.js';
const map = validateAngleMap({version:1,center:{key:'center',src:'center.png'},directions:[{key:'e',src:'e.png',angle:3},{key:'s',src:'s.png',angle:80},{key:'w',src:'w.png',angle:211}]});
test('circular distance wraps through zero and negative angles',()=>{ assert.equal(angleDistance(359,1),2);assert.equal(angleDistance(-10,10),20); });
test('arbitrary uneven directions choose nearest with stable ties',()=>{ assert.equal(selectFrame(map,350,false).key,'e');assert.equal(selectFrame(map,160,false).key,'w');assert.equal(selectFrame(map,41.5,false).key,'e');assert.equal(selectFrame(map,211,true).key,'center'); });
test('dead zone uses shorter dimension and origin uses actual rect',()=>{const r={left:100,top:200,width:400,height:200};assert.equal(pointerAngle(300,300,r,.12).isCenter,true);assert.equal(pointerAngle(324,300,r,.12).isCenter,true);assert.equal(pointerAngle(325,300,r,.12).isCenter,false);assert.equal(pointerAngle(300,250,r,.12).angle,270);});
test('reject empty, duplicate and unsafe maps',()=>{for(const value of [{}, {...map,directions:[]},{...map,directions:[map.directions[0],map.directions[0]]},{...map,center:{key:'c',src:'../secret.png'}},{...map,directions:[{key:'n',src:'n.png',angle:NaN}]}])assert.throws(()=>validateAngleMap(value));});
