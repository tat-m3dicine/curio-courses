export function mapToProperJSON(jsonString: string) {
  try {
    return JSON.parse(jsonString, reviver);
  } catch (err) {
    console.error(err);
    return {};
  }
}

const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

function reviver(key: string, value: string) {
  if (typeof value === 'string' && dateFormat.test(value)) {
    return new Date(value);
  }
  return value;
}
