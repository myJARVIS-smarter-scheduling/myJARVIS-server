exports.convertUtcDate = (dateString) => {
  const parts = dateString.split(" ");
  const datePart = parts[0];
  const timePart = parts[1];
  const period = parts[2];

  const [month, day, year] = datePart.split("/");
  const [hour, minute] = timePart.split(":");

  let hour24 = parseInt(hour, 10);

  if (period.toLowerCase() === "pm" && hour24 < 12) {
    hour24 += 12;
  } else if (period.toLowerCase() === "am" && hour24 === 12) {
    hour24 = 0;
  }

  const formattedMonth = month.padStart(2, "0");
  const formattedDay = day.padStart(2, "0");
  const formattedHour = hour24.toString().padStart(2, "0");
  const formattedMinute = minute.padStart(2, "0");

  return new Date(
    `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00Z`,
  );
};

exports.formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const formattedMonth = month < 10 ? `0${month}` : `${month}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;

  return `${year}-${formattedMonth}-${formattedDay}`;
};

exports.convertDateAsString = async (date, targetTimezone) => {
  const convertOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: targetTimezone,
  };

  // TODO. 사용자의 locale(언어)에 따라 추후 동적으로 생성할 수 있도록 합니다.
  const dateString = date.toLocaleString("en-US", convertOptions);

  const formattedDateString = dateString.replace(
    /(\d+)\/(\d+)\/(\d+),? (\d+):(\d+)/,
    (match, month, day, year, hour, minute) => {
      const hour12 = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";

      return `${year}/${month}/${day} ${hour12}:${minute} ${ampm}`;
    },
  );

  return formattedDateString;
};
