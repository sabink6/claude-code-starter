// preview page for newly created UI components

import Skeleton from "@/components/Skeleton"
import Avatar from "@/components/Avatar"

export default function PreviewPage() {
  return (
    <div className="page-content">
      <h2>Preview</h2>
      <h3>Skeleton</h3>
      <Skeleton />
      <h3>Avatar</h3>
      <Avatar name="bob" />
      <Avatar name="JohnDoe" />
    </div>
  )
}
