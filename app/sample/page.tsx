import fs from 'fs';
import path from 'path';

export default function SampleReportPage() {
  const htmlPath = path.join(process.cwd(), 'app', 'sample', 'report.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  return (
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
  );
}
