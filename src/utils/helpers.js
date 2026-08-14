export const detectSubjects = (uploadedFiles) => {
  const detectedSubjects = [];

  uploadedFiles.forEach((file) => {
    const name = file.name.toLowerCase();

    if (name.includes("math")) {
      detectedSubjects.push("Mathematics");
    } else if (name.includes("dbms") || name.includes("database")) {
      detectedSubjects.push("DBMS");
    } else if (name.includes("os") || name.includes("operating")) {
      detectedSubjects.push("Operating Systems");
    } else if (name.includes("network") || name.includes("cn")) {
      detectedSubjects.push("Computer Networks");
    } else if (name.includes("java")) {
      detectedSubjects.push("Java");
    } else if (name.includes("python")) {
      detectedSubjects.push("Python");
    } else if (name.includes("react") || name.includes("web")) {
      detectedSubjects.push("Web Development");
    } else if (name.includes("ai") || name.includes("machine") || name.includes("ml")) {
      detectedSubjects.push("Artificial Intelligence");
    } else if (name.includes("physics")) {
      detectedSubjects.push("Physics");
    } else {
      detectedSubjects.push("General Notes");
    }
  });

  return [...new Set(detectedSubjects)];
};

export const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
