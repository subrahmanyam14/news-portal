import { useState } from "react";
import { Calendar } from "lucide-react";

export default function DatePicker({
	selectedDate,
	availableDates,
	todayDateStr,
	onDateChange,
	isFutureDate,
	formatDate
}) {
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [currentMonthYear, setCurrentMonthYear] = useState({
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear()
	});

	const changeMonthYear = (increment) => {
		setCurrentMonthYear(prev => {
			let newMonth = prev.month + increment;
			let newYear = prev.year;

			if (newMonth > 12) {
				newMonth = 1;
				newYear++;
			} else if (newMonth < 1) {
				newMonth = 12;
				newYear--;
			}

			const newDate = new Date(newYear, newMonth - 1, 1);
			newDate.setHours(0, 0, 0, 0);
			if (newDate > new Date()) {
				return {
					month: new Date().getMonth() + 1,
					year: new Date().getFullYear()
				};
			}

			return { month: newMonth, year: newYear };
		});
	};

	const handleDateSelect = (date) => {
		if (isFutureDate(date)) return;
		onDateChange(date);
		setShowDatePicker(false);
	};

	return (
		<div className="relative">
			<button
				className="bg-gray-700 px-3 py-1 rounded flex items-center gap-2"
				onClick={() => setShowDatePicker(!showDatePicker)}
			>
				<Calendar size={16} />
				{selectedDate}
			</button>

			{showDatePicker && (
				<div className="absolute top-full left-0 mt-2 bg-gray-700 p-4 rounded shadow-lg z-50 w-64">
					<div className="flex justify-between items-center mb-2">
						<button
							onClick={() => changeMonthYear(-1)}
							className="hover:bg-gray-600 p-1 rounded"
						>
							&lt;
						</button>
						<span className="font-medium">
							{new Date(currentMonthYear.year, currentMonthYear.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
						</span>
						<button
							onClick={() => {
								const currentDate = new Date(currentMonthYear.year, currentMonthYear.month - 1, 1);
								currentDate.setHours(0, 0, 0, 0);
								if (currentDate < new Date()) {
									changeMonthYear(1);
								}
							}}
							className={`p-1 rounded ${new Date(currentMonthYear.year, currentMonthYear.month - 1, 1) >= new Date() ? 'text-gray-500 cursor-not-allowed' : 'hover:bg-gray-600'}`}
							disabled={new Date(currentMonthYear.year, currentMonthYear.month - 1, 1) >= new Date()}
						>
							&gt;
						</button>
					</div>

					<div className="grid grid-cols-7 gap-1 text-center text-sm">
						{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
							<div key={day} className="p-1 font-medium">{day}</div>
						))}

						{Array.from({ length: new Date(currentMonthYear.year, currentMonthYear.month - 1, 0).getDay() + 1 }).map((_, i) => (
							<div key={`empty-${i}`} className="p-1"></div>
						))}

						{Array.from({ length: new Date(currentMonthYear.year, currentMonthYear.month, 0).getDate() }, (_, i) => {
							const day = i + 1;
							const date = new Date(currentMonthYear.year, currentMonthYear.month - 1, day);
							const dateStr = formatDate(date);
							const isToday = dateStr === todayDateStr;
							const isAvailable = availableDates.some(d => d.date === dateStr);
							const isSelected = selectedDate === dateStr;
							const isFuture = isFutureDate(dateStr);

							return (
								<button
									key={day}
									className={`p-1 rounded ${isToday ? 'bg-blue-600' :
										isSelected ? 'border-2 border-blue-500' :
											isAvailable ? 'bg-gray-600 hover:bg-gray-500' :
												isFuture ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500'
										}`}
									onClick={() => !isFuture && isAvailable && handleDateSelect(dateStr)}
									disabled={isFuture || !isAvailable}
								>
									{day}
									{isToday && <span className="sr-only">(Today)</span>}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}