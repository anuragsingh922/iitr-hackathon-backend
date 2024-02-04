
function formatDate(inputDate) {
    const date = new Date(inputDate);

    // Define an array of month names
    const monthNames = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    // Extract date components
    const day = date.getDate();
    const month = monthNames[date.getMonth()]; // Get month name
    const year = date.getFullYear();

    // Extract time components
    const hours = date.getHours();
    const minutes = date.getMinutes();

    // Convert to 12-hour time format
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format


    // Create the formatted string
    const formattedDate = `${day} ${month} ${year} ${formattedHours}:${minutes=="0"?"00":minutes} ${ampm}`;

    return formattedDate;
}

module.exports = {formatDate}