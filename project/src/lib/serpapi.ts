
export async function searchProfiles(keywords: string, platform: string) {
  console.log("Searching for profiles with keywords:", keywords, "on platform:", platform);
  const response = await fetch(`http://localhost:5001/search?keywords=${encodeURIComponent(keywords)}&platform=${platform}`);
  const data = await response.json();
  return data;
}



// microsoft recruiter