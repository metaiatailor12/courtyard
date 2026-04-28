import { memo } from 'react';
import { useNavigate } from 'react-router';

type BookingStatusItem = {
  name: string;
  value: number;
  color: string;
};

interface BookingStatusChartProps {
  data?: BookingStatusItem[];
}

export const BookingStatusChart = memo(({ data }: BookingStatusChartProps) => {
  const navigate = useNavigate();
  const chartData = data && data.length ? data : [];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[240px] text-center text-gray-500">
        <p className="text-sm font-medium">No booking data yet</p>
        <p className="text-xs mt-1">Charts will update as bookings are created</p>
      </div>
    );
  }
  
  // Calculate pie slices
  let currentAngle = -90; // Start from top
  const slices = chartData.map((item) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const slice = {
      ...item,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      percentage: Math.round(percentage * 100),
    };
    currentAngle += angle;
    return slice;
  });

  // Helper function to calculate arc path
  const getArcPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const start = polarToCartesian(50, 50, outerRadius, endAngle);
    const end = polarToCartesian(50, 50, outerRadius, startAngle);
    const innerStart = polarToCartesian(50, 50, innerRadius, endAngle);
    const innerEnd = polarToCartesian(50, 50, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      `M ${start.x} ${start.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      'Z'
    ].join(' ');
  };

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <>
      <div className="w-full h-[180px] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full max-w-[180px]">
          {slices.map((slice, index) => (
            <g key={`slice-${index}-${slice.name}`}>
              <path
                d={getArcPath(slice.startAngle, slice.endAngle, 25, 40)}
                fill={slice.color}
                className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                onClick={() => navigate(`/admin/bookings?status=${String(slice.name).toLowerCase()}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/bookings?status=${String(slice.name).toLowerCase()}`); }}
              />
            </g>
          ))}
        </svg>
      </div>
      
      <div className="mt-3 md:mt-4 space-y-2">
        {chartData.map((item, index) => (
          <div
            key={`legend-${index}-${item.name}`}
            className="flex items-center justify-between cursor-pointer"
            onClick={() => navigate(`/admin/bookings?status=${String(item.name).toLowerCase()}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/bookings?status=${String(item.name).toLowerCase()}`); }}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }}></div>
              <span className="text-xs md:text-sm text-gray-600">{item.name}</span>
            </div>
            <span className="font-semibold text-sm md:text-base">{item.value}</span>
          </div>
        ))}
      </div>
    </>
  );
});

BookingStatusChart.displayName = 'BookingStatusChart';