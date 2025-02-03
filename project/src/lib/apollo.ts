import axios from 'axios';

export async function findEmail(name: string, domain: string) {
  try {
    console.log("Searching for emails with name:", name, "on platform:", domain);
    const response = await axios.post('http://localhost:5001/api/find-email', {
      name,
      domain
    });

    return response.data.email;
  } catch (error) {
    console.error('Error fetching email:', error);
    return null;
  }
}
