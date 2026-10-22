'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
export function LegacyEnglishRedirect() {
 const router = useRouter();
 useEffect(() => { router.replace('/en/docs/computer-vision/cvat-video-annotation-zh/'); }, [router]);
 return <Link href="/en/docs/computer-vision/cvat-video-annotation-zh/">Continue to the English edition ↗</Link>;
}
