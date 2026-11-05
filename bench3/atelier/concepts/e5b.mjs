// Concept B: huge cropped 여름 sinks into night band
export default () => {
  const W=1200,H=1800;
  return { width:W,height:H, tokens:{paper:'#efe3cf',ink:'#16243a',sun:'#e2603a',pale:'#f3c9a8',mute:'#8b93a0'},
    fonts:{m:'NanumMyeongjo',s:'Pretendard'}, background:'$paper', post:{grain:0.05},
    children:[
      {type:'text',x:-60,y:1120,size:820,font:'m',weight:800,text:'여름',fill:'$sun',letterSpacing:-40},
      {type:'rect',x:0,y:1010,w:W,h:H-1010,fill:'$ink'},
      {type:'text',x:96,y:1180,size:104,font:'m',weight:800,text:'의 끝에서',fill:'#efe3cf',letterSpacing:-3.5},
      {type:'text',x:96,y:1310,size:104,font:'m',weight:800,text:'우리는',fill:'#efe3cf',letterSpacing:-3.5},
      {type:'text',x:96,y:1620,size:36,font:'s',weight:600,text:'윤서해 장편소설',fill:'$pale'},
      {type:'text',x:1104,y:1700,size:24,font:'s',weight:500,align:'right',text:'파랑서가',fill:'$mute',letterSpacing:1},
    ]};
};
