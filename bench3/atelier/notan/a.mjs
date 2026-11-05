import { catD } from './catpath.mjs';
export default () => {
  const W=1600,H=1000;
  return { width:W,height:H, background:'#dddddd', children:[
    {type:'path', d:`M0,0 L780,0 L760,180 L900,180 L900,330 L1040,330 L1040,420 L1600,560 L1600,1000 L0,1000Z`, fill:'#888888'},
    {type:'path', d:`M0,1000 L0,820 L300,820 L1040,420 L1600,600 L1600,1000Z`, fill:'#222222'},
    {type:'path', d:catD(1040,425,1.05), fill:'#222222'},
  ]};
};
