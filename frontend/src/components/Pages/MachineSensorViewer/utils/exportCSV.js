export const exportCSV = (
  rows,
  sensorMap
) => {

  if (!rows.length) return;

  const columns = Object.keys(sensorMap);

  const headers = [
    "timestamp",
    ...columns,
  ];

  const csvRows = rows.map((r) =>
    headers
      .map((h) => r[h])
      .join(",")
  );

  const csvContent = [
    headers.join(","),
    ...csvRows,
  ].join("\n");

  const blob = new Blob(
    [csvContent],
    { type: "text/csv" }
  );

  const url =
    window.URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    "machine_sensor_data.csv";

  a.click();
};