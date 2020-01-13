export function mapToProperJSON(message: any) {
  try {
    const newValue = JSON.parse(message.value, reviver);
    const newMessage = { ...message, value: newValue };
    return newMessage;
  } catch (err) {
    return {};
  }
}

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

function reviver(key: string, value: any) {
  if (typeof value === 'string' && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}
