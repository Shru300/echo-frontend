import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Calendar = ({ selectedDate, onDateSelect, posts = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get dates that have posts
  const getDatesWithPosts = () => {
    const dates = new Set();
    posts.forEach(post => {
      if (post.createdAt) {
        const date = new Date(post.createdAt);
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        dates.add(dateKey);
      }
    });
    return dates;
  };

  const datesWithPosts = getDatesWithPosts();

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    if (date) {
      onDateSelect(date);
    }
  };

  const isSameDate = (date1, date2) => {
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const hasPosts = (date) => {
    if (!date) return false;
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return datesWithPosts.has(dateKey);
  };

  const clearDateFilter = () => {
    onDateSelect(null);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-neutral-900">Calendar</h3>
        {selectedDate && (
          <button
            onClick={clearDateFilter}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePreviousMonth}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <FaChevronLeft className="text-xs" />
        </button>
        <h4 className="text-sm font-semibold text-neutral-900">
          {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <button
          onClick={handleNextMonth}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <FaChevronRight className="text-xs" />
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-neutral-500 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isSelected = selectedDate && isSameDate(date, selectedDate);
          const hasPost = hasPosts(date);
          const isToday = isSameDate(date, new Date());

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={`aspect-square rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white'
                  : hasPost
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                  : isToday
                  ? 'bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-300'
                  : 'hover:bg-neutral-50 text-neutral-600'
              }`}
              title={hasPost ? 'Has posts' : ''}
            >
              {date.getDate()}
              {hasPost && !isSelected && (
                <span className="block w-1 h-1 bg-neutral-400 rounded-full mx-auto mt-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        <div className="flex items-center gap-2 text-xs text-neutral-600 mb-2">
          <div className="w-3 h-3 bg-neutral-100 rounded"></div>
          <span>Has posts</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <div className="w-3 h-3 bg-neutral-900 rounded"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar;

