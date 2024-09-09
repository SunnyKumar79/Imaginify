/* eslint-disable camelcase */
import { clerkClient } from "@clerk/nextjs";
import { WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";
import { connectToDatabase } from "@/lib/database/mongoose"; // Import your database connection function

export async function POST(req: Request) {
  // Load the webhook secret from environment variables
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local");
  }

  // Ensure MongoDB connection is established
  try {
    await connectToDatabase();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    return new Response("Error connecting to database", { status: 500 });
  }

  // Extract headers from the request
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id") || '';
  const svix_timestamp = headerPayload.get("svix-timestamp") || '';
  const svix_signature = headerPayload.get("svix-signature") || '';

  // Validate the presence of required headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing Svix headers", { status: 400 });
  }

  // Parse the request body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create an instance of Svix Webhook with the secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }

  // Extract event data and type
  const { id } = evt.data;
  const eventType = evt.type;

  // Ensure id is a string
  if (!id) {
    return new Response("Error: Missing user id", { status: 400 });
  }

  // Handle different event types
  try {
    switch (eventType) {
      case "user.created":
        const { email_addresses, image_url, first_name, last_name, username } = evt.data;

        const newUser = await createUser({
          clerkId: id,
          email: email_addresses[0]?.email_address || '',
          username: username || '',
          firstName: first_name || '',
          lastName: last_name || '',
          photo: image_url || '',
        });

        // Update user metadata with Clerk
        if (newUser) {
          await clerkClient.users.updateUserMetadata(id, {
            publicMetadata: { userId: newUser._id },
          });
        }

        return NextResponse.json({ message: "User created", user: newUser });

      case "user.updated":
        const { image_url: updatedImageUrl, first_name: updatedFirstName, last_name: updatedLastName, username: updatedUsername } = evt.data;

        const updatedUser = await updateUser(id, {
          firstName: updatedFirstName || '',
          lastName: updatedLastName || '',
          username: updatedUsername || '',
          photo: updatedImageUrl || '',
        });

        return NextResponse.json({ message: "User updated", user: updatedUser });

      case "user.deleted":
        const deletedUser = await deleteUser(id);
        return NextResponse.json({ message: "User deleted", user: deletedUser });

      default:
        console.log(`Unhandled event type: ${eventType}`);
        return new Response("Event type not handled", { status: 400 });
    }
  } catch (error) {
    console.error("Error handling event:", error);
    return new Response("Error handling event", { status: 500 });
  }
}
