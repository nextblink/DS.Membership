import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = {
  Female: '#ec4899',
  Male: '#3b82f6',
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="font-semibold text-xs"
      pointerEvents="none"
    >
      {(percent * 100).toFixed(0)}%
    </text>
  )
}

export default function GenderPie({ femaleCount, maleCount }) {
  const total = femaleCount + maleCount

  if (total === 0) {
    return <div className="text-center text-gray-400 text-sm">No data</div>
  }

  const data = [
    { name: 'Female', value: femaleCount, gender: 'Female' },
    { name: 'Male', value: maleCount, gender: 'Male' },
  ]

  return (
    <div className="flex justify-center">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={20}
            outerRadius={45}
            paddingAngle={1}
            dataKey="value"
            label={CustomLabel}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell key={entry.gender} fill={COLORS[entry.gender]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
