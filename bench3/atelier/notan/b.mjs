import { catD } from './catpath.mjs';
export default () => {
  const W=1600,H=1000;
  return { width:W,height:H, background:'#dddddd', children:[
    {type:'ridge', w:1600, y:600, bottom:1000, amp:30, freq:5, seed:3, fill:'#888888'},
    {type:'path', d:`M0,1000 L0,560 L380,560 L380,470 L760,470 L760,560 L980,700 L1600,780 L1600,1000Z`, fill:'#222222'},
    {type:'path', d:catD(560,472,1.3), fill:'#222222'},
  ]};
};
