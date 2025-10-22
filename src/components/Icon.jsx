import React from 'react'
import IconWrapper from './icons/Icon'

export function PlusIcon({className='w-5 h-5'}){
  return <IconWrapper name="plus" className={className} />
}

export function CloseIcon({className='w-5 h-5'}){
  return <IconWrapper name="close" className={className} />
}

export function DashboardIcon({className='w-5 h-5'}){
  return <IconWrapper name="dashboard" className={className} />
}

export function BriefcaseIcon({className='w-5 h-5'}){
  return <IconWrapper name="briefcase" className={className} />
}

export function UsersIcon({className='w-5 h-5'}){
  return <IconWrapper name="users" className={className} />
}

export function KanbanIcon({className='w-5 h-5'}){
  return <IconWrapper name="kanban" className={className} />
}

export function SearchIcon({className='w-4 h-4'}){
  return <IconWrapper name="search" className={className} />
}
