// Concept A: vertical Myeongjo, horizon line interrupts, setting sun
export default () => {
  const W=1200,H=1800,S=210;
  return { width:W,height:H, tokens:{paper:'#ece5d8',ink:'#1c2a3d',sun:'#d9542f',mute:'#6b6f73'},
    fonts:{m:'NanumMyeongjo',s:'Pretendard'}, background:'$paper', post:{grain:0.05},
    children:[
      {type:'rect',x:0,y:1250,w:W,h:3,fill:'$ink'},
      {type:'circle',cx:300,cy:1250,r:70,fill:'$sun'},
      {type:'rect',x:0,y:1253,w:W,h:H-1253,fill:'$paper'},
      {type:'text',vertical:true,x:930,y:150,size:S,font:'m',weight:800,text:'여름의 끝에서',fill:'$ink',letterSpacing:-0.03*S},
      {type:'text',vertical:true,x:700,y:610,size:S,font:'m',weight:800,text:'우리는',fill:'$ink',letterSpacing:-0.03*S},
      {type:'text',x:96,y:1560,size:40,font:'s',weight:600,text:'윤서해 장편소설',fill:'$ink',letterSpacing:-0.4},
      {type:'text',x:96,y:1700,size:26,font:'s',weight:500,text:'파랑서가',fill:'$mute',letterSpacing:1},
    ]};
};
