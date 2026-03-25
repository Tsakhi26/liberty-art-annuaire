import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Edit, GripVertical } from 'lucide-react'

export default function SortableRow({ student, isInCoaching, isNew, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b hover:bg-gray-50"
    >
      <td className="px-6 py-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="text-gray-400 hover:text-gray-600" size={20} />
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="relative w-12 h-12">
          <img
            src={student.photo_url}
            alt={student.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-liberty-orange"
          />
          {isInCoaching(student.created_at) && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" title="En coaching"></div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 font-semibold text-gray-900">
        {student.name}
        {isNew && isNew(student.created_at) && (
          <span className="ml-2 bg-liberty-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Nouveau
          </span>
        )}
      </td>
      <td className="px-6 py-4 max-w-xs">
        <p className="text-sm text-gray-900 truncate" title={student.bio}>
          {student.bio || '-'}
        </p>
      </td>
      <td className="px-6 py-4">
        {isInCoaching(student.created_at) ? (
          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            En coaching
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">
            Ancien
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {student.insta_url && <span className="text-pink-600">📷</span>}
          {student.fb_url && <span className="text-blue-600">👍</span>}
          {student.tiktok_url && <span>🎵</span>}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(student)}
            className="text-blue-600 hover:text-blue-800 transition transform hover:scale-110"
            title="Modifier"
          >
            <Edit size={20} />
          </button>
          <button
            onClick={() => onDelete(student.id, student.photo_url)}
            className="text-red-600 hover:text-red-800 transition transform hover:scale-110"
            title="Supprimer"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </td>
    </tr>
  )
}
