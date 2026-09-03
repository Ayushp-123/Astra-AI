export const classifySubject = (fileName = "", textSample = "") => {
  const combined = `${fileName} ${textSample}`.toLowerCase();

  if (
    combined.includes("math") ||
    combined.includes("calculus") ||
    combined.includes("algebra") ||
    combined.includes("differential") ||
    combined.includes("discrete")
  ) {
    return "Mathematics";
  } else if (
    combined.includes("dbms") ||
    combined.includes("database") ||
    combined.includes("sql") ||
    combined.includes("relational") ||
    combined.includes("schema") ||
    combined.includes("mongodb")
  ) {
    return "DBMS";
  } else if (
    combined.includes("os") ||
    combined.includes("operating system") ||
    combined.includes("scheduling") ||
    combined.includes("deadlock") ||
    combined.includes("semaphore") ||
    combined.includes("paging") ||
    combined.includes("thread")
  ) {
    return "Operating Systems";
  } else if (
    combined.includes("network") ||
    combined.includes("cn") ||
    combined.includes("tcp") ||
    combined.includes("osi layer") ||
    combined.includes("protocol") ||
    combined.includes("routing")
  ) {
    return "Computer Networks";
  } else if (
    combined.includes("data structure") ||
    combined.includes("algorithm") ||
    combined.includes("dsa") ||
    combined.includes("binary tree") ||
    combined.includes("linked list") ||
    combined.includes("graph")
  ) {
    return "Data Structures & Algorithms";
  } else if (combined.includes("java") || combined.includes("spring")) {
    return "Java";
  } else if (
    combined.includes("python") ||
    combined.includes("django") ||
    combined.includes("flask") ||
    combined.includes("numpy") ||
    combined.includes("pandas")
  ) {
    return "Python";
  } else if (
    combined.includes("react") ||
    combined.includes("web") ||
    combined.includes("html") ||
    combined.includes("css") ||
    combined.includes("javascript") ||
    combined.includes("frontend")
  ) {
    return "Web Development";
  } else if (
    combined.includes("ai") ||
    combined.includes("machine learning") ||
    combined.includes("deep learning") ||
    combined.includes("neural") ||
    combined.includes("nlp") ||
    combined.includes("ml")
  ) {
    return "Artificial Intelligence";
  } else if (
    combined.includes("physics") ||
    combined.includes("mechanics") ||
    combined.includes("electromagnetism") ||
    combined.includes("thermodynamics") ||
    combined.includes("quantum")
  ) {
    return "Physics";
  } else if (
    combined.includes("chemistry") ||
    combined.includes("organic") ||
    combined.includes("inorganic") ||
    combined.includes("reaction")
  ) {
    return "Chemistry";
  } else if (
    combined.includes("biology") ||
    combined.includes("genetics") ||
    combined.includes("cell") ||
    combined.includes("anatomy")
  ) {
    return "Biology";
  } else {
    return "General Notes";
  }
};

export const detectSubjects = (uploadedFiles) => {
  const detectedSubjects = uploadedFiles.map((file) => classifySubject(file.name));
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

