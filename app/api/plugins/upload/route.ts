import { NextRequest, NextResponse } from 'next/server';

function getBackendUrl() {
  const url = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  return url ?? 'http://localhost:8080';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const backendUrl = getBackendUrl();
    
    console.log('API Route: Forwarding upload to backend:', backendUrl);
    
    // Forward the FormData to the backend
    // Don't set Content-Type header - let fetch set it automatically for FormData
    const res = await fetch(`${backendUrl}/plugins/upload`, {
      method: 'POST',
      body: formData,
      // Don't set headers - fetch will set Content-Type with boundary automatically
    });

    console.log('API Route: Backend response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      console.error('API Route: Backend error:', errorText);
      return NextResponse.json(
        { error: errorText || 'Failed to upload plugin' },
        { status: res.status }
      );
    }

    const data = await res.json().catch(async () => {
      // If JSON parsing fails, try text
      const text = await res.text();
      return { success: true, message: text };
    });
    
    console.log('API Route: Upload successful');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Route: Upload error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload plugin' },
      { status: 500 }
    );
  }
}

