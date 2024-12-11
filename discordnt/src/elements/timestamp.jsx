const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];
const weekNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dateStyle = {
    't': date => `${date.getHours()}:${date.getMinutes()}`,
    'T': date => `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`,
    'd': date => `${date.getDate()}/${date.getMonth() +1}/${date.getFullYear()}`,
    'D': date => `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`,
    'f': date => `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`,
    'F': date => `${weekNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()} ${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`,
    'R': date => {
        const now = new Date();
        const years = now.getYear() - date.getYear();
        const months = now.getMonth() - date.getMonth();
        const days = now.getDate() - date.getDate();
        const hours = now.getHours() - date.getHours();
        const minutes = now.getMinutes() - date.getMinutes();
        const seconds = now.getSeconds() - date.getSeconds();
        if (years !== 0)        return years >= 0   ? `in ${years} years`     :     `${years} years ago`;
        else if (months !== 0)  return months >= 0  ? `in ${months} months`   :   `${months} months ago`;
        else if (days !== 0)    return days >= 0    ? `in ${days} days`       :       `${days} days ago`;
        else if (hours !== 0)   return hours >= 0   ? `in ${hours} hours`     :     `${hours} hours ago`;
        else if (minutes !== 0) return minutes >= 0 ? `in ${minutes} minutes` : `${minutes} minutes ago`;
        else if (seconds !== 0) return seconds >= 0 ? `in ${seconds} seconds` : `${seconds} seconds ago`;
        return 'now';
    },
    'M': date => {
        const now = new Date();
        const years = now.getYear() - date.getYear();
        const months = now.getMonth() - date.getMonth();
        const days = now.getDate() - date.getDate();
        const hours = now.getHours() - date.getHours();
        const minutes = now.getMinutes() - date.getMinutes();
        const seconds = now.getSeconds() - date.getSeconds();
        if (years !== 0 || months !== 0 || days !== 0) return `${months}/${days}/${years}`;
        else if (hours !== 0)   return `${hours} hours ago`;
        else if (minutes !== 0) return `${minutes} minutes ago`;
        else if (seconds !== 0) return `${seconds} seconds ago`;
        return 'Just Now';
    }
}

export const TimeStamp = <define
    attributes={['t', 's']}
    this={{
        render() {
            const style = this.getAttribute('s') || 'F';
            const time = new Date(this.getAttribute('t'));
            this.#display.textContent = dateStyle[style](time);
        }
    }}
    onconnected={() => {
        render();
        if (!this.#priv.intr) this.#priv.intr = setInterval(this.render.bind(this), 1000);
    }}
    ondisconnected={() => { if (this.#priv.intr) clearInterval(this.#priv.intr) }}
    onattributes={() => this.render()}
/>