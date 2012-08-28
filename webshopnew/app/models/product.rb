class Product < ActiveRecord::Base
  attr_accessible :brand, :category, :description, :name, :price, :reviews_count
  has_many :reviews, :dependent => :destroy

  validates :name, :presence => true, :length => { :minimum => 3 }
  validates :category, :length => { :minimum => 5, :allow_blank => true }
  validates :price, :presence => true, :numericality => true

  validate :free_by_price_validation

  before_save :fill_description

  def free_by_price_validation
    if price == 0 && category != 'free'
      errors.add :base, 'El precio no corresponde con la categoría'
    end
  end

  def fill_description
    if description.blank?
      self.description=name
    end
  end

end
