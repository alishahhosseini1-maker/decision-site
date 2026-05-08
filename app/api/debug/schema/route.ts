import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Query the information_schema to get actual column names
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = 'decisions'
          ORDER BY column_name
        `
      });

    if (error) {
      // If RPC doesn't exist, try a simpler approach - just select * from an empty result
      const { data: sampleData, error: sampleError } = await supabase
        .from('decisions')
        .select('*')
        .limit(0);

      if (sampleError) {
        return NextResponse.json({
          error: 'Could not fetch schema',
          details: sampleError.message,
          suggestion: 'Check Supabase logs or run this SQL directly: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'decisions\' ORDER BY column_name'
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Schema info not available via RPC, but here are the columns from a sample query',
        note: 'This shows columns that exist, but not their data types',
        columns: Object.keys(sampleData?.[0] || {})
      });
    }

    return NextResponse.json({
      schema: data,
      totalColumns: data?.length || 0
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Schema query failed', details: err.message },
      { status: 500 }
    );
  }
}
