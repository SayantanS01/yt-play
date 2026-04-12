"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

const data = [
  { name: "Mon", video: 400, audio: 240 },
  { name: "Tue", video: 300, audio: 139 },
  { name: "Wed", video: 200, audio: 980 },
  { name: "Thu", video: 278, audio: 390 },
  { name: "Fri", video: 189, audio: 480 },
  { name: "Sat", video: 239, audio: 380 },
  { name: "Sun", video: 349, audio: 430 },
];

export default function DashboardChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorVideo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF0000" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#FF0000" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorAudio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#ffffff20" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          dy={10}
        />
        <YAxis 
          stroke="#ffffff20" 
          fontSize={10} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #ffffff10", borderRadius: "8px", fontSize: "10px" }}
        />
        <Area 
          type="monotone" 
          dataKey="video" 
          stroke="#FF0000" 
          fillOpacity={1} 
          fill="url(#colorVideo)" 
          strokeWidth={2}
        />
        <Area 
          type="monotone" 
          dataKey="audio" 
          stroke="#3B82F6" 
          fillOpacity={1} 
          fill="url(#colorAudio)" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
