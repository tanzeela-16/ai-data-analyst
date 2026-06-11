import { useState, useRef, useEffect } from "react";
import {
  BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const C = {
  bg:         "#F0F2F7",
  canvas:     "#FFFFFF",
  sidebar:    "#1B2035",
  sidebarHi:  "#242B42",
  sidebarBdr: "#2E3650",
  violet:     "#6C63FF",
  violetDim:  "#6C63FF1A",
  violetGlow: "#6C63FF33",
  teal:       "#00BFA6",
  tealDim:    "#00BFA615",
  amber:      "#F59E0B",
  rose:       "#F43F5E",
  roseDim:    "#F43F5E12",
  textPri:    "#111827",
  textSec:    "#4B5563",
  textMid:    "#9CA3AF",
  bdr:        "#E5E7EB",
  white:      "#FFFFFF",
  chart: ["#6C63FF","#00BFA6","#F59E0B","#F43F5E","#3B82F6","#8B5CF6","#10B981"],
};

const SUGGESTIONS = {
  ecommerce: ["Top 5 products by revenue","Monthly revenue trend","Revenue by city","Sales by category"],
  jobs:      ["Which job has the highest demand?","Average salary by city","Most in-demand skills","Remote vs on-site %"],
  default:   ["Summarise this dataset","Top 10 rows by value","Which columns have missing data?","Numeric column distribution"],
};
function getSuggestions(n="") {
  if (n.includes("ecommerce")||n.includes("sales")) return SUGGESTIONS.ecommerce;
  if (n.includes("job")||n.includes("pakistan"))    return SUGGESTIONS.jobs;
  return SUGGESTIONS.default;
}

const STEPS = ["Reading data structure","Writing Pandas code","Executing analysis","Rendering visualisation","Composing insight"];

/* ── inject global responsive styles once ── */
function useGlobalStyles() {
  useEffect(() => {
    const id = "datamind-styles";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { overflow: hidden; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #2E3650; border-radius: 4px; }

      /* layout breakpoints */
      .dm-layout { display: flex; height: 100vh; overflow: hidden; }

      /* sidebar — full width on mobile, fixed on desktop */
      .dm-sidebar {
        width: 280px; flex-shrink: 0;
        background: #1B2035;
        display: flex; flex-direction: column;
        overflow-y: auto;
        border-right: 1px solid #2E3650;
        transition: transform .25s ease;
        z-index: 100;
      }
      .dm-main   { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
      .dm-topbar { height: 56px; flex-shrink: 0; display: flex; align-items: center; padding: 0 20px; gap: 12px; background: #fff; border-bottom: 1px solid #E5E7EB; box-shadow: 0 1px 3px #0002; }
      .dm-results{ flex: 1; overflow-y: auto; padding-bottom: 40px; }

      /* hamburger — hidden on desktop */
      .dm-hamburger { display: none; }

      /* card margins */
      .dm-card { margin: 20px 24px 0; }

      @media (max-width: 768px) {
        body { overflow: auto; }
        .dm-layout { flex-direction: column; height: auto; min-height: 100vh; overflow: auto; }

        .dm-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          transform: translateX(-100%);
          width: 82vw; max-width: 320px;
          box-shadow: 4px 0 24px #00000044;
        }
        .dm-sidebar.open { transform: translateX(0); }

        .dm-main   { height: 100vh; overflow: hidden; }
        .dm-hamburger { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #6C63FF1A; border: 1px solid #6C63FF44; border-radius: 8px; cursor: pointer; font-size: 18px; flex-shrink: 0; }
        .dm-overlay { display: none; position: fixed; inset: 0; background: #00000055; z-index: 99; }
        .dm-overlay.open { display: block; }
        .dm-card { margin: 16px 16px 0; }
      }

      @media (max-width: 480px) {
        .dm-sidebar { width: 92vw; }
        .dm-card { margin: 12px 12px 0; }
      }

      /* tab row wraps on small screens */
      .dm-tabs { display: flex; border-bottom: 1px solid #E5E7EB; padding-left: 10px; background: #F0F2F7; overflow-x: auto; white-space: nowrap; }
      .dm-tabs::-webkit-scrollbar { height: 0; }

      /* chart container min-height safety */
      .recharts-responsive-container { min-width: 0 !important; }

      /* empty state centers on all sizes */
      .dm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; padding: 32px 24px; text-align: center; }

      /* textarea full-width inside sidebar */
      .dm-textarea { width: 100%; }

      /* topbar title hidden on very small screens */
      @media (max-width: 380px) {
        .dm-topbar-title { display: none; }
      }
    `;
    document.head.appendChild(s);
  }, []);
}

/* ── Tooltip ── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.canvas, border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 16px #0003", fontSize: 13 }}>
      <div style={{ color: C.textMid, marginBottom: 3, fontSize: 11 }}>{label}</div>
      <div style={{ color: C.violet, fontWeight: 700, fontSize: 15 }}>
        {typeof payload[0].value === "number" ? payload[0].value.toLocaleString() : payload[0].value}
      </div>
    </div>
  );
};

/* ── Chart ── */
function ChartView({ chart }) {
  if (!chart) return <EmptyChart msg="No chart for this query — check the Insight tab" />;
  const { type, x, y, title, labels, values } = chart;
  const hasXY  = Array.isArray(x) && Array.isArray(y) && x.length > 0 && y.length > 0;
  const hasPie = Array.isArray(labels) && Array.isArray(values) && labels.length > 0;
  if (!hasXY && !hasPie) return <EmptyChart msg="Chart data was empty — check the Table tab" />;

  const ax = { fill: C.textSec, fontSize: 11 };
  const gr = { stroke: C.bdr, strokeDasharray: "4 4" };

  if (type === "pie") {
    const pd = (labels||x).map((l,i)=>({ name:l, value:Number((values||y)[i]) }));
    return <ChartWrap title={title}>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={pd} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="45%" innerRadius="22%" paddingAngle={2}
            label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
            {pd.map((_,i)=><Cell key={i} fill={C.chart[i%C.chart.length]}/>)}
          </Pie>
          <Tooltip content={<ChartTip/>}/>
        </PieChart>
      </ResponsiveContainer>
    </ChartWrap>;
  }

  const data = x.map((v,i)=>({ x:v, y:Number(y[i]) }));

  if (type === "line") return <ChartWrap title={title}>
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{top:8,right:16,bottom:52,left:0}}>
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={C.violet} stopOpacity={0.18}/>
            <stop offset="100%" stopColor={C.violet} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid {...gr}/>
        <XAxis dataKey="x" tick={ax} angle={-30} textAnchor="end" interval="preserveStartEnd" tickLine={false} axisLine={{stroke:C.bdr}}/>
        <YAxis tick={ax} tickLine={false} axisLine={false} tickFormatter={v=>v.toLocaleString()} width={48}/>
        <Tooltip content={<ChartTip/>}/>
        <Area type="monotone" dataKey="y" stroke={C.violet} strokeWidth={2.5} fill="url(#vg)" dot={{fill:C.violet,r:3,strokeWidth:0}} activeDot={{r:5,fill:C.violet,stroke:C.white,strokeWidth:2}}/>
      </AreaChart>
    </ResponsiveContainer>
  </ChartWrap>;

  if (type === "scatter") return <ChartWrap title={title}>
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{top:8,right:16,bottom:40,left:0}}>
        <CartesianGrid {...gr}/>
        <XAxis dataKey="x" tick={ax} tickLine={false} axisLine={{stroke:C.bdr}}/>
        <YAxis dataKey="y" tick={ax} tickLine={false} axisLine={false} width={48}/>
        <Tooltip content={<ChartTip/>}/>
        <Scatter data={data} fill={C.teal} opacity={0.85}/>
      </ScatterChart>
    </ResponsiveContainer>
  </ChartWrap>;

  const long = data.some(d=>String(d.x).length>9);
  return <ChartWrap title={title}>
    <ResponsiveContainer width="100%" height={Math.max(260, data.length*(long?40:48))}>
      <BarChart data={data} layout={long?"vertical":"horizontal"}
        margin={long?{top:4,right:48,bottom:4,left:110}:{top:4,right:16,bottom:56,left:0}}
        barCategoryGap="35%">
        <CartesianGrid {...gr} horizontal={!long} vertical={long}/>
        {long ? <>
          <YAxis dataKey="x" type="category" tick={{...ax,fontSize:11}} tickLine={false} axisLine={false} width={105}/>
          <XAxis type="number" tick={ax} tickLine={false} axisLine={{stroke:C.bdr}} tickFormatter={v=>v.toLocaleString()}/>
        </> : <>
          <XAxis dataKey="x" tick={ax} angle={-35} textAnchor="end" interval={0} tickLine={false} axisLine={{stroke:C.bdr}}/>
          <YAxis tick={ax} tickLine={false} axisLine={false} tickFormatter={v=>v.toLocaleString()} width={48}/>
        </>}
        <Tooltip content={<ChartTip/>} cursor={{fill:`${C.violet}08`}}/>
        <Bar dataKey="y" radius={long?[0,6,6,0]:[6,6,0,0]} maxBarSize={46}>
          {data.map((_,i)=><Cell key={i} fill={C.chart[i%C.chart.length]}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </ChartWrap>;
}

function ChartWrap({title,children}) {
  return <div>
    {title && <p style={{fontSize:12,fontWeight:600,color:C.textSec,marginBottom:12,textTransform:"uppercase",letterSpacing:"0.6px"}}>{title}</p>}
    {children}
  </div>;
}
function EmptyChart({msg}) {
  return (
    <div style={{height:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,background:C.bg,borderRadius:10,border:`1.5px dashed ${C.bdr}`}}>
      <span style={{fontSize:28,opacity:0.4}}>📭</span>
      <span style={{fontSize:13,color:C.textMid}}>{msg}</span>
    </div>
  );
}

/* ── Table ── */
function TableView({rows}) {
  if (!rows?.length) return <EmptyChart msg="No data returned."/>;
  const cols = Object.keys(rows[0]);
  return (
    <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${C.bdr}`}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:400}}>
        <thead>
          <tr style={{background:C.bg}}>
            {cols.map(c=>(
              <th key={c} style={{padding:"10px 14px",textAlign:"left",color:C.textSec,fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:"0.5px",borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row,i)=>(
            <tr key={i} style={{borderBottom:`1px solid ${C.bdr}`}}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg}
              onMouseLeave={e=>e.currentTarget.style.background=C.canvas}>
              {cols.map(c=>{
                const v=row[c]??"—", num=typeof row[c]==="number";
                return <td key={c} style={{padding:"10px 14px",color:num?C.violet:C.textPri,fontWeight:num?600:400,whiteSpace:"nowrap"}}>{num?Number(v).toLocaleString():String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Loading ── */
function LoadingCard({step}) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const t=setInterval(()=>setTick(n=>n+1),500); return()=>clearInterval(t); },[]);
  const dots=".".repeat((tick%3)+1);
  return (
    <div className="dm-card" style={{background:C.canvas,borderRadius:14,border:`1px solid ${C.bdr}`,padding:"24px 24px",boxShadow:"0 2px 12px #0001",marginBottom:0}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <div style={{width:10,height:10,borderRadius:"50%",background:C.violet,boxShadow:`0 0 12px ${C.violet}`}}/>
        <span style={{fontSize:15,fontWeight:600,color:C.textPri}}>Agent is thinking{dots}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {STEPS.map((s,i)=>{
          const done=i<step,active=i===step;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:22,height:22,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,transition:"all .3s",
                background:done?C.tealDim:active?C.violetDim:C.bg,
                border:`1.5px solid ${done?C.teal:active?C.violet:C.bdr}`,
                color:done?C.teal:active?C.violet:C.textMid}}>
                {done?"✓":active?"▶":""}
              </div>
              <span style={{fontSize:14,color:done?C.textSec:active?C.textPri:C.textMid,fontWeight:active?500:400,transition:"color .3s"}}>{s}</span>
              {active&&<span style={{marginLeft:"auto",fontSize:12,color:C.violet}}>running…</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Result Card ── */
function ResultCard({item,index}) {
  const [tab,setTab]=useState("chart");
  if (!item?.result) return null;
  const {result,question}=item;
  const attempts=result.attempts||1;
  const tabs=[
    {id:"chart", icon:"📊", label:"Chart"},
    {id:"answer",icon:"💡", label:"Insight"},
    {id:"table", icon:"📋", label:"Table"},
    {id:"code",  icon:"🧑‍💻",label:"Code"},
  ];
  return (
    <div className="dm-card" style={{background:C.canvas,borderRadius:14,border:`1px solid ${C.bdr}`,overflow:"hidden",boxShadow:"0 2px 12px #0001"}}>
      <div style={{display:"flex"}}>
        <div style={{width:4,background:`linear-gradient(180deg,${C.violet},${C.teal})`,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>

          {/* Header */}
          <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",alignItems:"flex-start",gap:12,background:C.canvas,flexWrap:"wrap"}}>
            <div style={{width:36,height:36,borderRadius:9,background:C.violetDim,border:`1px solid ${C.violetGlow}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔍</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:600,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Query #{index+1}</div>
              <div style={{fontSize:14,color:C.textPri,fontWeight:500,lineHeight:1.5,wordBreak:"break-word"}}>{question}</div>
            </div>
            <div style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:600,flexShrink:0,whiteSpace:"nowrap",marginTop:2,
              background:attempts>1?"#F59E0B18":C.tealDim,
              border:`1.5px solid ${attempts>1?C.amber+"55":C.teal+"44"}`,
              color:attempts>1?C.amber:C.teal}}>
              {attempts>1?`⚡ Retry ${attempts-1}×`:"✓ OK"}
            </div>
          </div>

          {/* Tabs */}
          <div className="dm-tabs">
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                display:"inline-flex",alignItems:"center",gap:5,
                padding:"11px 14px",fontSize:12,fontWeight:tab===t.id?600:400,
                color:tab===t.id?C.violet:C.textSec,
                borderBottom:`2.5px solid ${tab===t.id?C.violet:"transparent"}`,
                borderTop:"none",borderLeft:"none",borderRight:"none",
                background:"none",cursor:"pointer",transition:"all .15s",whiteSpace:"nowrap",
              }}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{padding:"20px 18px"}}>
            {tab==="chart"  && <ChartView chart={result.chart}/>}
            {tab==="answer" && <div style={{fontSize:14,color:C.textPri,lineHeight:1.9,background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:10,padding:"18px 20px"}}>{result.answer||"No insight returned."}</div>}
            {tab==="table"  && <TableView rows={result.table}/>}
            {tab==="code"   && <pre style={{background:"#0F1117",border:`1px solid #2D3142`,borderRadius:10,padding:"18px 20px",fontSize:12,color:"#A5B4FC",overflowX:"auto",lineHeight:1.8,fontFamily:"'Fira Code','JetBrains Mono',monospace",margin:0,wordBreak:"break-all",whiteSpace:"pre-wrap"}}>{result.code||"No code available."}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar Content ── */
function SidebarContent({file,ctx,question,setQuestion,loading,handleAsk,onFile,fileRef,dragging,setDragging,closeSidebar}) {
  const canAsk = file && question.trim() && !loading;
  const suggestions = getSuggestions(file?.name||"");
  return (
    <>
      {/* Logo */}
      <div style={{padding:"18px 16px",borderBottom:`1px solid ${C.sidebarBdr}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg,${C.violet},#9C5FFF)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>🤖</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.white}}>DataMind AI</div>
            <div style={{fontSize:12,color:"#8B9DC3",marginTop:1}}>Autonomous Analyst</div>
          </div>
        </div>
        {/* Close button — only visible on mobile via CSS */}
        <button onClick={closeSidebar} style={{background:"transparent",border:"none",color:"#8B9DC3",fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>✕</button>
      </div>

      {/* Upload */}
      <div style={{padding:"18px 14px",borderBottom:`1px solid ${C.sidebarBdr}`}}>
        <SLabel>Dataset</SLabel>
        <div onClick={()=>fileRef.current.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);onFile(e.dataTransfer.files[0]);}}
          style={{border:`2px dashed ${dragging?C.violet:file?C.teal:C.sidebarBdr}`,borderRadius:10,padding:"18px 12px",textAlign:"center",cursor:"pointer",background:dragging?"#6C63FF15":file?"#00BFA60D":C.sidebarHi,transition:"all .2s"}}>
          <div style={{fontSize:26,marginBottom:5}}>{file?"✅":"📂"}</div>
          <div style={{fontSize:13,color:file?C.teal:"#A8BBDA",fontWeight:500}}>{file?"Click to replace":"Drop CSV / Excel"}</div>
          <div style={{fontSize:12,color:"#8B9DC3",marginTop:3}}>or click to browse · max 10 MB</div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={e=>onFile(e.target.files[0])}/>
        </div>
        {file && (
          <div style={{marginTop:10,padding:"8px 12px",background:"#00BFA610",border:`1px solid ${C.teal}33`,borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.teal,flexShrink:0}}/>
            <span style={{fontSize:12,color:C.teal,fontWeight:500,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</span>
          </div>
        )}
      </div>

      {/* Stats + Columns */}
      {ctx && (
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${C.sidebarBdr}`}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[["Rows",ctx.rows.toLocaleString()],["Columns",ctx.cols.length]].map(([l,v])=>(
              <div key={l} style={{background:C.sidebarHi,border:`1px solid ${C.sidebarBdr}`,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:18,fontWeight:800,color:C.violet}}>{v}</div>
                <div style={{fontSize:12,color:"#8B9DC3",marginTop:2,textTransform:"uppercase",letterSpacing:"0.8px"}}>{l}</div>
              </div>
            ))}
          </div>
          <SLabel>Columns</SLabel>
          <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:160,overflowY:"auto"}}>
            {ctx.cols.map((c,i)=>(
              <div key={c} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:6,background:C.sidebarHi}}>
                <span style={{fontSize:12,color:"#8B9DC3",minWidth:18,fontWeight:600}}>{i+1}</span>
                <span style={{fontSize:13,color:"#C8D8F0"}}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ask */}
      <div style={{padding:"16px 14px",borderBottom:`1px solid ${C.sidebarBdr}`}}>
        <SLabel>Ask a question</SLabel>
        <textarea rows={3} disabled={!file||loading} value={question}
          onChange={e=>setQuestion(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleAsk();}}}
          placeholder={file?"e.g. Which city has highest revenue?":"Upload a file first…"}
          style={{width:"100%",background:C.sidebarHi,border:`1.5px solid ${question.trim()?C.violet+"88":C.sidebarBdr}`,borderRadius:8,color:"#D4E0F5",fontSize:13,padding:"10px 12px",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,transition:"border-color .2s",caretColor:C.violet}}
        />
        <button onClick={handleAsk} disabled={!canAsk} style={{marginTop:10,width:"100%",padding:"12px",borderRadius:8,border:"none",fontSize:14,fontWeight:700,cursor:canAsk?"pointer":"not-allowed",transition:"all .2s",
          background:canAsk?`linear-gradient(135deg,${C.violet},#9C5FFF)`:C.sidebarBdr,
          color:canAsk?C.white:"#4A5880",
          boxShadow:canAsk?`0 4px 16px ${C.violet}44`:"none"}}>
          {loading?"Analysing…":"▶  Run Analysis"}
        </button>
        <p style={{fontSize:12,color:"#8B9DC3",textAlign:"center",marginTop:7}}>Enter to run · Shift+Enter for newline</p>
      </div>

      {/* Suggestions */}
      {file && (
        <div style={{padding:"16px 14px"}}>
          <SLabel>Try these</SLabel>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {suggestions.map(s=>(
              <button key={s} onClick={()=>{setQuestion(s);closeSidebar();}}
                style={{textAlign:"left",background:C.sidebarHi,border:`1px solid ${C.sidebarBdr}`,borderRadius:7,padding:"10px 12px",fontSize:13,color:"#A8BBDA",cursor:"pointer",transition:"all .15s",lineHeight:1.4}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.violet+"66";e.currentTarget.style.color=C.white;e.currentTarget.style.background="#6C63FF15";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.sidebarBdr;e.currentTarget.style.color="#A8BBDA";e.currentTarget.style.background=C.sidebarHi;}}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SLabel({children}) {
  return <p style={{fontSize:12,fontWeight:700,color:"#8B9DC3",textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>{children}</p>;
}

/* ── MAIN APP ── */
export default function App() {
  useGlobalStyles();
  const [file,setFile]         = useState(null);
  const [ctx,setCtx]           = useState(null);
  const [question,setQuestion] = useState("");
  const [history,setHistory]   = useState([]);
  const [loading,setLoading]   = useState(false);
  const [step,setStep]         = useState(0);
  const [dragging,setDragging] = useState(false);
  const [error,setError]       = useState(null);
  const [sidebarOpen,setSidebarOpen] = useState(false);
  const fileRef  = useRef();
  const bottomRef = useRef();

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[history,loading]);
  useEffect(()=>{
    if (!loading) return;
    setStep(0);
    const timers = STEPS.map((_,i)=>setTimeout(()=>setStep(i),i*1100));
    return ()=>timers.forEach(clearTimeout);
  },[loading]);

  function onFile(f) {
    if (!f) return;
    setFile(f); setError(null); setHistory([]);
    const r = new FileReader();
    r.onload = e => {
      const lines = e.target.result.trim().split("\n");
      const cols  = lines[0].split(",").map(c=>c.trim().replace(/"/g,""));
      setCtx({rows:lines.length-1,cols});
    };
    r.readAsText(f);
  }

  async function handleAsk() {
    if (!file||!question.trim()||loading) return;
    const q=question.trim();
    setQuestion(""); setLoading(true); setError(null);
    const form=new FormData();
    form.append("file",file);
    form.append("question",q);
    try {
      const res=await fetch(`${API_URL}/analyze`,{method:"POST",body:form});
      if (!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.detail||"Server error");}
      const result=await res.json();
      setHistory(h=>[...h,{question:q,result}]);
    } catch(e){setError(e.message);}
    finally{setLoading(false);}
  }

  return (
    <div className="dm-layout" style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:C.bg,color:C.textPri}}>

      {/* Overlay for mobile sidebar */}
      <div className={`dm-overlay${sidebarOpen?" open":""}`} onClick={()=>setSidebarOpen(false)}/>

      {/* Sidebar */}
      <aside className={`dm-sidebar${sidebarOpen?" open":""}`}>
        <SidebarContent
          file={file} ctx={ctx} question={question} setQuestion={setQuestion}
          loading={loading} handleAsk={handleAsk} onFile={onFile} fileRef={fileRef}
          dragging={dragging} setDragging={setDragging}
          closeSidebar={()=>setSidebarOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className="dm-main">

        {/* Topbar */}
        <div className="dm-topbar">
          {/* Hamburger — shown only on mobile via CSS */}
          <button className="dm-hamburger" onClick={()=>setSidebarOpen(o=>!o)}>☰</button>

          <span className="dm-topbar-title" style={{fontSize:15,fontWeight:700,color:C.textPri}}>Analysis Workspace</span>

          {/* File pill — always visible */}
          {file ? (
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 12px",background:C.tealDim,border:`1px solid ${C.teal}44`,borderRadius:20,overflow:"hidden",maxWidth:200}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:C.teal,flexShrink:0}}/>
              <span style={{fontSize:12,color:C.teal,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{file.name}</span>
            </div>
          ) : (
            <span style={{fontSize:13,color:C.textMid}}>No file loaded</span>
          )}

          {ctx && (
            <div style={{display:"flex",gap:14,marginLeft:4}}>
              {[["Rows",ctx.rows.toLocaleString()],["Cols",ctx.cols.length]].map(([l,v])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.violet,lineHeight:1}}>{v}</div>
                  <div style={{fontSize:10,color:C.textMid,textTransform:"uppercase",letterSpacing:"0.5px"}}>{l}</div>
                </div>
              ))}
            </div>
          )}

          {history.length>0 && (
            <button onClick={()=>{setHistory([]);setError(null);}}
              style={{marginLeft:"auto",padding:"6px 14px",borderRadius:7,background:"transparent",border:`1px solid ${C.bdr}`,color:C.textSec,fontSize:12,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>
              Clear
            </button>
          )}

          {history.length===0 && <div style={{marginLeft:"auto",padding:"5px 12px",borderRadius:20,background:C.violetDim,border:`1px solid ${C.violet}33`,color:C.violet,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>LangChain Agent</div>}
        </div>

        {/* Results */}
        <div className="dm-results">
          {history.length===0&&!loading&&!error&&(
            <div className="dm-empty">
              <div style={{width:80,height:80,borderRadius:20,background:C.canvas,border:`2px dashed ${C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>📊</div>
              <div style={{fontSize:20,fontWeight:700,color:C.textPri}}>Your workspace is empty</div>
              <div style={{fontSize:14,color:C.textSec,maxWidth:340,lineHeight:1.7}}>Upload a CSV or Excel file, then ask any question. The AI agent will write code, run it, and show you a chart with an explanation.</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
                {["📈 Trends","🏆 Top items","🏙️ By city","🔍 Summaries"].map(t=>(
                  <div key={t} style={{padding:"8px 16px",background:C.canvas,border:`1px solid ${C.bdr}`,borderRadius:20,fontSize:13,color:C.textSec}}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {history.map((item,i)=><ResultCard key={i} item={item} index={i}/>)}
          {loading && <LoadingCard step={step}/>}

          {error && (
            <div className="dm-card" style={{padding:"14px 18px",background:C.roseDim,border:`1px solid ${C.rose}44`,borderRadius:10,fontSize:14,color:C.rose,fontWeight:500}}>
              ⚠️ {error}
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
      </div>
    </div>
  );
}
