// Concept C: stepped lines descending like the sun / time passing; color cools per step
export default () => {
  const W=1200,H=1800,S=230;
  return { width:W,height:H, tokens:{paper:'#e9e4da',ink:'#1b2b44',sun:'#d8542f',mid:'#5c6f8a',mute:'#6b6f73'},
    fonts:{m:'NanumMyeongjo',s:'Pretendard'}, background:'$paper', post:{grain:0.05},
    children:[
      {type:'text',x:-20,y:420,size:S,font:'m',weight:800,text:'여름의',fill:'$sun',letterSpacing:-0.035*S},
      {type:'text',x:250,y:720,size:S,font:'m',weight:800,text:'끝에서',fill:'$ink',letterSpacing:-0.035*S},
      {type:'text',x:520,y:1020,size:S,font:'m',weight:800,text:'우리는',fill:'$mid',letterSpacing:-0.035*S},
      {type:'text',x:96,y:1600,size:38,font:'s',weight:600,text:'윤서해 장편소설',fill:'$ink'},
      {type:'text',x:96,y:1700,size:26,font:'s',weight:500,text:'파랑서가',fill:'$mute',letterSpacing:1},
    ]};
};
