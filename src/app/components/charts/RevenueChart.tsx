import { memo } from 'react';

type RevenuePoint = {
  month: string;
  revenue: number;
};

interface RevenueChartProps {
  data?: RevenuePoint[];
}

export const RevenueChart = memo(({ data }: RevenueChartProps) => {
  const chartData = data && data.length ? data : [];

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[250px] text-center text-gray-500">
        <p className="text-sm font-medium">No revenue data yet</p>
        <p className="text-xs mt-1">Charts will update as bookings and subscriptions are created</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 0);
  const scaleMax = maxRevenue > 0 ? maxRevenue : 1;
  const barWidth = 100 / chartData.length;
  
  return (
    <div className="w-full h-[250px] flex flex-col">
      {/* Chart Area */}
      <div className="flex-1 relative flex items-end justify-around px-4 pb-8">
        {chartData.map((item, index) => {
          const height = (item.revenue / scaleMax) * 100;
          
          return (
            <div
              key={`bar-${index}-${item.month}`}
              className="group relative flex flex-col items-center"
              style={{ width: `${barWidth - 2}%` }}
            >
              {/* Tooltip */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm whitespace-nowrap pointer-events-none z-10">
                <div className="text-gray-600">Revenue</div>
                <div className="font-semibold">₹{item.revenue.toLocaleString()}</div>
              </div>
              
              {/* Bar */}
              <div
                className="w-full bg-yellow-700 rounded-t-lg transition-all duration-300 hover:bg-yellow-800 max-w-[60px]"
                style={{ height: `${height}%` }}
              />
              
              {/* Label */}
              <div className="text-xs text-gray-600 mt-2 absolute -bottom-6">
                {item.month}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 h-[200px] flex flex-col justify-between text-xs text-gray-600 pr-2">
        <div>₹{Math.round(scaleMax).toLocaleString()}</div>
        <div>₹{Math.round(scaleMax * 0.66).toLocaleString()}</div>
        <div>₹{Math.round(scaleMax * 0.33).toLocaleString()}</div>
        <div>₹0</div>
      </div>
    </div>
  );
});

RevenueChart.displayName = 'RevenueChart';
