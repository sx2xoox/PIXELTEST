import { catD } from './catpath.mjs';
export default () => {
  const W=1600,H=1000;
  return { width:W,height:H, background:'#888888', children:[
    {type:'rect', x:0,y:0,w:1600,h:120, fill:'#222222'},
    {type:'rect', x:0,y:0,w:320,h:1000, fill:'#222222'},
    {type:'rect', x:0,y:780,w:1600,h:220, fill:'#222222'},
    {type:'rect', x:880,y:240,w:260,h:240, fill:'#dddddd'},
    {type:'rect', x:860,y:480,w:300,h:20, fill:'#222222'},
    {type:'path', d:catD(980,482,1.4), fill:'#222222'},
  ]};
};
