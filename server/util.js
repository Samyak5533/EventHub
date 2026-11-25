// "YYYY-MM-DDTHH:MM" in server local time. Event dates are stored in this
// format (the same one the admin form's datetime-local input uses), so plain
// string comparison orders them correctly.
function localDateTime(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = { localDateTime };
