"use client";

import { readPsd } from "ag-psd";

export default function Playground() {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      return;
    }
    const fileData = await fileList[0].arrayBuffer();
    const psdData = readPsd(fileData);

    console.log(psdData);
  };

  return (
    <div>
      <input type={"file"} onChange={handleFileChange}></input>
    </div>
  );
}
