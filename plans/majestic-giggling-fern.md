# Add Media Attachments to Create Post Dialog

## Context
The create post dialog currently collects content, platforms, schedule, and template — but has no way to attach images or videos. The backend already fully supports media: `createPostSchema` accepts `mediaIds`, the `PostMedia` junction table exists, and the tRPC `post.create` mutation wires them up. The user wants to attach media by browsing existing assets or uploading new files directly from the create post dialog.

## Existing Infrastructure (reuse, don't rebuild)
- **`AssetPicker`** (`src/components/shared/asset-picker.tsx`): Multi-select grid with search, filters by a single `AssetType`, returns selected IDs
- **`uploadFiles()`** (`src/lib/upload.ts`): Uploads files to `/api/upload`, returns created asset records with IDs, supports progress callback
- **`/api/upload` route** (`src/app/api/upload/route.ts`): Handles file storage + Asset DB creation
- **`createPostSchema`** (`src/lib/validations/post.ts`): Already has `mediaIds: z.array(z.string().cuid()).optional()`
- **`post.create` mutation** (`src/server/trpc/routers/post.ts`): Already creates `PostMedia` records from `mediaIds`

## Changes

### 1. Modify `src/components/shared/asset-picker.tsx`
- Make the `type` prop optional (`type?: AssetType`)
- When `type` is undefined, don't filter by type (show all images, videos, GIFs)
- This allows the create post dialog to show all media types in one picker

### 2. Modify `src/app/(dashboard)/clients/[clientId]/posts/page.tsx`
Add a "Media" section to the create post form (between Schedule and DialogFooter):

**State additions:**
- `mediaIds: string[]` added to `newPost` state (reset on dialog close)
- `mediaTab: "browse" | "upload"` to toggle between browse/upload views
- `uploading: boolean` and `uploadProgress: number` for upload feedback

**UI additions (inside the form grid, after the Schedule field):**
- **Label**: "Media (optional)"
- **Two toggle buttons**: "Browse Library" / "Upload New"
- **Browse Library view**: Renders `<AssetPicker>` without a type filter, passing `selectedIds={newPost.mediaIds}` and `onSelectionChange` to update state
- **Upload New view**:
  - A file input (`accept="image/*,video/*"`) styled as a drop zone with icon and text
  - On file selection: call `uploadFiles()`, show progress bar, on completion add returned asset IDs to `mediaIds`
- **Selected media strip**: Below the picker/uploader, show thumbnails of all selected media with an X button to remove each. Fetch asset details via `trpc.asset.list` filtered to the selected IDs (or track names/urls from upload results + picker data)

**Mutation update:**
- Pass `mediaIds: newPost.mediaIds.length > 0 ? newPost.mediaIds : undefined` to `createMutation.mutate()`

**Reset update:**
- Clear `mediaIds` in `resetCreateDialog()`

## Verification
1. `npx tsc --noEmit` passes
2. Open create post dialog → "Browse Library" tab shows existing assets (images + videos) with search
3. Select assets → they appear as thumbnails below with X to remove
4. Switch to "Upload New" → pick files → progress shown → uploaded assets auto-added to selection
5. Submit post → post is created with media attached
6. Post appears in list with media thumbnails (existing display logic)
