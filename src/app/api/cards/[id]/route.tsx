import { ListObjectsCommand, S3Client } from "@aws-sdk/client-s3";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Create a new S3 client
    const s3Client = new S3Client({
      region: "ap-southeast-2",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_SECRET_KEY as string,
      },
    });

    const bucket = "pokemon-tcg-pocket-data";

    // Construct the prefix path using the id parameter
    const prefix = `Booster-Pack/${params.id}/zh_TW/`;

    // List objects in the specified folder
    const command = new ListObjectsCommand({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    console.log("test");

    if (!response.Contents || response.Contents.length === 0) {
      return Response.json(
        {
          success: false,
          message: "No files found for the specified package",
        },
        { status: 404 }
      );
    }

    const files = response.Contents.map((item) => {
      if (!item.Key) return null;

      const fileName = item.Key.split("/").pop() || "";
      const id = fileName.split(".")[0];

      return {
        id,
        url: `https://${bucket}.s3.ap-southeast-2.amazonaws.com/${item.Key}`,
      };
    }).filter(Boolean);

    return Response.json({ files });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return Response.json(
      {
        error: "Failed to fetch package files",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
